import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { HoverWipePlayer } from './components/HoverWipePlayer';
import { TelemetryBar } from './components/TelemetryBar';
import { HardwareGateModal } from './components/HardwareGateModal';
import { VideoMetadata, AppConfig, TelemetryState, QualityProfile, GpuDevice, ThemeMode } from './types';

export const App: React.FC = () => {
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [outputVideoFile, setOutputVideoFile] = useState<string>('');
  const [targetResolution, setTargetResolution] = useState<'4K' | '2X'>('4K');

  // Auto-dismiss queue toast after 4.5s
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const [config, setConfig] = useState<AppConfig>({
    qualityProfile: 'FAITHFUL',
    outputDir: '',
    fallbackDir: 'C:\\Users\\sunny\\Desktop\\1\\output_4k\\',
    namingTemplate: '{filename}_4K_DLSS5.mp4',
    enableFaststart: true,
    colorStandard: 'BT.709',
    deblockStrength: 'WEAK'
  });

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    isProcessing: false,
    isPaused: false,
    currentFrame: 0,
    totalFrames: 452,
    currentFps: 0,
    gpuLoadPercent: 0,
    vramUsedMb: 0,
    vramTotalMb: 8192,
    etaSeconds: 0,
    circuitBreakerStatus: 'OPERATIONAL'
  });

  // Physical GPU devices state
  const [gpus, setGpus] = useState<GpuDevice[]>([
    {
      id: 'gpu-default',
      name: 'NVIDIA GeForce RTX 4070 (检测中...)',
      vendor: 'NVIDIA',
      vendor_cn: 'NVIDIA (N卡)',
      vram_mb: 8192,
      is_discrete: true,
      is_recommended: true,
      is_supported: true,
      rejection_reason: null,
      tag: 'NVIDIA'
    }
  ]);
  const [selectedGpuId, setSelectedGpuId] = useState<string>('gpu-default');
  const [isGateModalOpen, setIsGateModalOpen] = useState<boolean>(false);

  // Theme state: dark | light | auto
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('ns_theme_mode');
    return (saved === 'light' || saved === 'dark' || saved === 'auto') ? (saved as ThemeMode) : 'dark';
  });

  // Theme synchronizer with root DOM, Edge theme-color, and native DWM titlebar
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      let isDark = true;
      if (themeMode === 'dark') {
        root.classList.add('dark');
        isDark = true;
      } else if (themeMode === 'light') {
        root.classList.remove('dark');
        isDark = false;
      } else {
        // Auto: follow system color scheme
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isSystemDark) {
          root.classList.add('dark');
          isDark = true;
        } else {
          root.classList.remove('dark');
          isDark = false;
        }
      }

      // Update meta theme-color for Edge native titlebar skin
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.setAttribute('name', 'theme-color');
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute('content', isDark ? '#0D0E14' : '#F3F4F6');

      // Inform backend server to update native Windows DWM window titlebar theme
      fetch('/api/set_theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: isDark ? 'dark' : 'light' })
      }).catch(() => {});
    };

    applyTheme();
    localStorage.setItem('ns_theme_mode', themeMode);

    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [themeMode]);

  // Heartbeat loop to keep backend server aware of active frontend session
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen for window close / unload to immediately notify backend server to exit
  useEffect(() => {
    const handleUnload = () => {
      const payload = JSON.stringify({ reason: 'window_unload' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/window_close', payload);
      } else {
        fetch('/api/window_close', { method: 'POST', keepalive: true, body: payload }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  // Fetch real system information (OS, physical GPUs)
  useEffect(() => {
    fetch('/api/system_info')
      .then(res => res.json())
      .then(data => {
        if (data.gpus && data.gpus.length > 0) {
          setGpus(data.gpus);
          setSelectedGpuId(data.selected_gpu || data.gpus[0].id);
        }
      })
      .catch(err => console.error('Failed to load system info:', err));
  }, []);

  // Verify whether the currently selected video already has a valid exported 4K file on disk
  const verifyExportedFile = useCallback(async (filePath: string, userDir?: string) => {
    if (!filePath) {
      setOutputVideoFile('');
      return;
    }
    try {
      const res = await fetch('/api/check_exported_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputFile: filePath, userDir: userDir || config.outputDir })
      });
      const data = await res.json();
      if (data.exists && data.outputPath) {
        setOutputVideoFile(data.outputPath);
      } else {
        setOutputVideoFile('');
      }
    } catch (err) {
      console.error('Failed to verify exported file:', err);
      setOutputVideoFile('');
    }
  }, [config.outputDir]);

  // Load initial video if started with right-click argument or CLI parameter
  useEffect(() => {
    fetch('/api/initial_video')
      .then(res => res.json())
      .then(data => {
        if (data.initial_video && typeof data.initial_video === 'object') {
          const v = data.initial_video;
          const newVideo: VideoMetadata = {
            filePath: v.filePath,
            fileName: v.fileName,
            width: v.width,
            height: v.height,
            durationSeconds: v.duration,
            fps: v.fps,
            codec: v.codec,
            fileSizeBytes: v.size,
            status: v.status,
            statusMessage: v.reason
          };
          setVideo(newVideo);
          if (v.filePath) {
            verifyExportedFile(v.filePath, config.outputDir);
            fetch('/api/resolve_path', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inputFile: v.filePath, userDir: config.outputDir })
            })
            .then(r => r.json())
            .then(d => {
              if (d.resolvedDir) {
                setConfig(prev => ({ ...prev, fallbackDir: d.resolvedDir + '\\' }));
              }
            })
            .catch(() => {});
            setTelemetry(prev => ({ ...prev, totalFrames: v.total_frames || 60, currentFrame: 0 }));
          }
        }
      })
      .catch(() => {});
  }, [verifyExportedFile, config.outputDir]);

  // Poll export status, GPU telemetry, external injection, and task queue
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch('/api/export_status');
        const data = await res.json();

        // 1. External injected video while idle: automatically switch preview
        if (data.pending_injected_video && !data.is_processing) {
          const p = data.pending_injected_video;
          const newVideo: VideoMetadata = {
            filePath: p.filePath,
            fileName: p.fileName,
            width: p.width,
            height: p.height,
            durationSeconds: p.duration,
            fps: p.fps,
            codec: p.codec,
            fileSizeBytes: p.size,
            status: p.status,
            statusMessage: p.reason
          };
          setVideo(newVideo);
          verifyExportedFile(p.filePath, config.outputDir);
          setTelemetry(prev => ({ ...prev, totalFrames: p.total_frames || 60, currentFrame: 0 }));
          fetch('/api/consume_injected_video', { method: 'POST' }).catch(() => {});
        }

        // 2. Queue updates and toast alerts
        if (data.queue && Array.isArray(data.queue)) {
          setTelemetry(prev => {
            const prevQueueLen = prev.queue ? prev.queue.length : 0;
            if (data.queue.length > prevQueueLen && prev.isProcessing) {
              const latest = data.queue[data.queue.length - 1];
              setToastMessage(`已将视频 [${latest.fileName}] 加入渲染排队队列（当前第 ${data.queue.length} 位）`);
            }
            return {
              ...prev,
              queue: data.queue
            };
          });
        }

        // 3. Export status processing / finished
        if (data.status === 'PROCESSING') {
          setTelemetry(prev => ({
            ...prev,
            isProcessing: true,
            currentFrame: data.current_frame,
            totalFrames: data.total_frames || prev.totalFrames,
            currentFps: data.current_fps,
            gpuLoadPercent: data.gpu_load,
            vramUsedMb: data.vram_used_mb,
          }));
        } else if (data.status === 'FINISHED' && telemetry.isProcessing) {
          setTelemetry(prev => ({
            ...prev,
            isProcessing: false,
            currentFrame: data.total_frames,
            currentFps: data.current_fps,
            gpuLoadPercent: data.gpu_load,
            vramUsedMb: data.vram_used_mb
          }));
          if (data.output_file) {
            setOutputVideoFile(data.output_file);
          }
          alert(`4K 神经超分成功导出完成！\n文件保存至:\n${data.output_file}`);
        } else if (data.status === 'ERROR' && telemetry.isProcessing) {
          setTelemetry(prev => ({ ...prev, isProcessing: false }));
          alert(`导出异常: ${data.error_msg}`);
        } else if (!telemetry.isProcessing) {
          // Keep idle hardware telemetry fresh
          setTelemetry(prev => ({
            ...prev,
            gpuLoadPercent: data.gpu_load || 0,
            vramUsedMb: data.vram_used_mb || 0
          }));
        }
      } catch (e) {
        // quiet error
      }
    }, telemetry.isProcessing ? 400 : 1500);

    return () => clearInterval(timer);
  }, [telemetry.isProcessing, config.outputDir, verifyExportedFile]);

  // Handle native file selection
  const handleNativeSelectFile = async () => {
    try {
      const res = await fetch('/api/native_select_file', { method: 'POST' });
      const data = await res.json();
      if (data.status && data.status !== 'CANCELLED') {
        const newVideo: VideoMetadata = {
          filePath: data.filePath,
          fileName: data.fileName,
          width: data.width,
          height: data.height,
          durationSeconds: data.duration,
          fps: data.fps,
          codec: data.codec,
          fileSizeBytes: data.size,
          status: data.status,
          statusMessage: data.reason
        };
        setVideo(newVideo);
        
        // Immediately verify if matching 4K export exists for the newly selected video
        await verifyExportedFile(data.filePath, config.outputDir);

        const dirRes = await fetch('/api/resolve_path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputFile: data.filePath, userDir: config.outputDir })
        });
        const dirData = await dirRes.json();
        if (dirData.resolvedDir) {
          setConfig(prev => ({ ...prev, fallbackDir: dirData.resolvedDir + '\\' }));
        }
        setTelemetry(prev => ({ ...prev, totalFrames: data.total_frames || 60, currentFrame: 0 }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle native folder picker
  const handleNativeSelectFolder = async () => {
    try {
      const res = await fetch('/api/native_select_folder', { method: 'POST' });
      const data = await res.json();
      if (data.selectedDir) {
        const newDir = data.selectedDir + '\\';
        setConfig(prev => ({ ...prev, outputDir: newDir }));
        if (video?.filePath) {
          verifyExportedFile(video.filePath, newDir);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open directory in Windows Explorer
  const handleOpenExplorer = async () => {
    const target = config.outputDir || config.fallbackDir;
    await fetch('/api/open_folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: target })
    });
  };

  const activeGpu = gpus.find(g => g.id === selectedGpuId) || gpus[0];

  // Start 4K export pipeline with selected profile, target resolution, and accelerator GPU
  const handleStartExport = async () => {
    if (!video) return;

    // 硬件设备准入门禁校验：识别A卡和N卡以及显存最少要求2GB，其他型号显卡弹窗警告并拒绝生成
    if (activeGpu && !activeGpu.is_supported) {
      setIsGateModalOpen(true);
      return; // 拒绝生成
    }

    setTelemetry(prev => ({ ...prev, isProcessing: true, isPaused: false }));
    try {
      const res = await fetch('/api/start_export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputFile: video.filePath,
          userDir: config.outputDir,
          qualityProfile: config.qualityProfile,
          targetResolution: targetResolution,
          totalFrames: telemetry.totalFrames,
          selectedGpu: selectedGpuId
        })
      });
      const data = await res.json();
      if (data.status === 'REJECTED') {
        setIsGateModalOpen(true);
        throw new Error(data.msg || '硬件门禁校验未通过，已拒绝生成');
      }
      if (data.status !== 'STARTED') {
        throw new Error(data.msg || '无法启动导出任务');
      }
    } catch (e: any) {
      alert(`启动导出失败: ${e.message}`);
      setTelemetry(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const canExport = video !== null && video.status !== 'REJECTED' && video.status !== 'ALREADY_4K';

  // Compute resolution badges
  const inResStr = video ? `${video.width}×${video.height}` : '540×960';
  const outResStr = targetResolution === '2X' && video
    ? `${video.width * 2}×${video.height * 2}`
    : (video && video.width < video.height ? '2160×3840' : '3840×2160');

  return (
    <div className="w-screen h-screen flex flex-col bg-[#F3F4F6] text-gray-900 dark:bg-[#08090C] dark:text-gray-100 font-sans select-none overflow-hidden antialiased transition-colors duration-200">
      <TitleBar
        gpus={gpus}
        selectedGpuId={selectedGpuId}
        onSelectGpu={setSelectedGpuId}
        themeMode={themeMode}
        onToggleTheme={setThemeMode}
        onOpenGateModal={() => setIsGateModalOpen(true)}
      />

      {/* 待处理队列 Fluent UI 浮层 Toast 通知 */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-xl bg-gray-900/95 dark:bg-[#1C1F2B]/95 backdrop-blur-md border border-cyan-500/50 text-white dark:text-cyan-200 text-xs font-medium shadow-2xl flex items-center gap-2.5 animate-fade-in pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 hover:text-white p-0.5 hover:bg-white/10 rounded cursor-pointer transition-colors"
            title="关闭"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col p-2.5 gap-2 w-full h-[calc(100vh-40px)] max-w-[1500px] mx-auto overflow-hidden">
        {/* Sleek Workstation Toolbar with Dropdowns (Single Row, Never Wraps) */}
        <Toolbar
          video={video}
          config={config}
          targetResolution={targetResolution}
          onChangeTargetResolution={setTargetResolution}
          onChangeProfile={(profile: QualityProfile) => setConfig(prev => ({ ...prev, qualityProfile: profile }))}
          onCallNativePicker={handleNativeSelectFile}
          onCallNativeFolderPicker={handleNativeSelectFolder}
          onOpenExplorer={handleOpenExplorer}
          isProcessing={telemetry.isProcessing}
        />

        {/* Hero Video Viewport with Zoom Inspection & A/B Modes (Fills Remaining Screen Height) */}
        <HoverWipePlayer
          inputVideoPath={video?.filePath}
          outputVideoPath={outputVideoFile}
          inputResolution={inResStr}
          outputResolution={outResStr}
          isProcessing={telemetry.isProcessing}
        />

        {/* Modern Minimalist Hardware & Action Bar (Single Row, Never Wraps) */}
        <TelemetryBar
          telemetry={telemetry}
          onStartExport={handleStartExport}
          canExport={canExport}
          isGpuSupported={activeGpu?.is_supported ?? true}
        />
      </main>

      {/* 硬件设备准入门禁拦截弹窗警告 */}
      <HardwareGateModal
        isOpen={isGateModalOpen}
        gpu={activeGpu}
        supportedGpus={gpus.filter(g => g.is_supported)}
        onSelectGpu={(id) => setSelectedGpuId(id)}
        onClose={() => setIsGateModalOpen(false)}
      />
    </div>
  );
};
