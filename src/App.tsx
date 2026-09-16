import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { HoverWipePlayer } from './components/HoverWipePlayer';
import { TelemetryBar } from './components/TelemetryBar';
import { VideoMetadata, AppConfig, TelemetryState, QualityProfile } from './types';

export const App: React.FC = () => {
  const [video, setVideo] = useState<VideoMetadata | null>({
    filePath: 'C:\\Users\\sunny\\Desktop\\1\\素材\\微信视频2026-07-23_010220_787.mp4',
    fileName: '微信视频2026-07-23_010220_787.mp4',
    width: 1080,
    height: 1920,
    durationSeconds: 15.0,
    fps: 30,
    codec: 'h264',
    fileSizeBytes: 8729217,
    status: 'RECOMMENDED',
    statusMessage: '推荐输入画质 (1080x1920)，支持 4K 神经重绘与硬件超分加速。'
  });

  const [outputVideoFile, setOutputVideoFile] = useState<string>('');
  const [targetResolution, setTargetResolution] = useState<'4K' | '2X'>('4K');

  const [config, setConfig] = useState<AppConfig>({
    qualityProfile: 'FAITHFUL',
    outputDir: '',
    fallbackDir: 'C:\\Users\\sunny\\Desktop\\1\\素材\\output_4k\\',
    namingTemplate: '{filename}_4K_DLSS5.mp4',
    enableFaststart: true,
    colorStandard: 'BT.709',
    deblockStrength: 'WEAK'
  });

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    isProcessing: false,
    isPaused: false,
    currentFrame: 0,
    totalFrames: 450,
    currentFps: 0,
    gpuLoadPercent: 0,
    vramUsedMb: 0,
    vramTotalMb: 8192,
    etaSeconds: 0,
    circuitBreakerStatus: 'OPERATIONAL'
  });

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

  // Initial load check
  useEffect(() => {
    if (video?.filePath) {
      fetch('/api/resolve_path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputFile: video.filePath, userDir: config.outputDir })
      })
      .then(res => res.json())
      .then(data => {
        if (data.resolvedDir) {
          setConfig(prev => ({ ...prev, fallbackDir: data.resolvedDir + '\\' }));
        }
      })
      .catch(() => {});

      verifyExportedFile(video.filePath, config.outputDir);
    }
  }, []);

  // Poll export status and GPU telemetry
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch('/api/export_status');
        const data = await res.json();
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
          alert(`🎉 4K 神经超分成功导出完成！\n文件保存至:\n${data.output_file}`);
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
    }, telemetry.isProcessing ? 400 : 2000);

    return () => clearInterval(timer);
  }, [telemetry.isProcessing]);

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

  // Start 4K export pipeline
  const handleStartExport = async () => {
    if (!video) return;
    setTelemetry(prev => ({ ...prev, isProcessing: true, isPaused: false }));
    try {
      const res = await fetch('/api/start_export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputFile: video.filePath,
          userDir: config.outputDir,
          totalFrames: telemetry.totalFrames
        })
      });
      const data = await res.json();
      if (data.status !== 'STARTED') {
        throw new Error(data.msg || '无法启动导出任务');
      }
    } catch (e: any) {
      alert(`启动导出失败: ${e.message}`);
      setTelemetry(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const canExport = video !== null && video.status !== 'REJECTED' && video.status !== 'ALREADY_4K';

  return (
    <div className="w-screen h-screen flex flex-col bg-[#08090C] text-gray-100 font-sans select-none overflow-hidden antialiased">
      <TitleBar />

      <main className="flex-1 flex flex-col p-3.5 space-y-3 max-w-[1400px] w-full mx-auto overflow-hidden">
        {/* Sleek Workstation Toolbar with Dropdowns */}
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

        {/* Hero Video Viewport with Dual-Mode (Original Preview vs 4K Wipe Comparison) */}
        <div className="flex-1 min-h-0 flex flex-col justify-center">
          <HoverWipePlayer
            inputVideoPath={video?.filePath}
            outputVideoPath={outputVideoFile}
            isProcessing={telemetry.isProcessing}
          />
        </div>

        {/* Modern Minimalist Hardware & Action Bar */}
        <TelemetryBar
          telemetry={telemetry}
          onStartExport={handleStartExport}
          canExport={canExport}
        />
      </main>
    </div>
  );
};
