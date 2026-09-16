import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { VideoInputSection } from './components/VideoInputSection';
import { PathConfigSection } from './components/PathConfigSection';
import { ParameterPanel } from './components/ParameterPanel';
import { HoverWipePlayer } from './components/HoverWipePlayer';
import { TelemetryBar } from './components/TelemetryBar';
import { VideoMetadata, AppConfig, TelemetryState } from './types';

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
    statusMessage: '黄金推荐分辨率 (1080x1920)，已激活 DLSS 5 神经材质重塑与 4K 硬件时序拉升。',
    isConfirmed480pRisk: false
  });

  const [outputVideoFile, setOutputVideoFile] = useState<string>(
    'C:\\Users\\sunny\\Desktop\\1\\素材\\output_4k\\微信视频2026-07-23_010220_787_4K_DLSS5.mp4'
  );

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
    currentFrame: 450,
    totalFrames: 450,
    currentFps: 44.8,
    gpuLoadPercent: 28,
    vramUsedMb: 2048,
    vramTotalMb: 6144,
    etaSeconds: 0,
    circuitBreakerStatus: 'OPERATIONAL'
  });

  // Check initial video probe & path
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
    }
  }, []);

  useEffect(() => {
    let timer: number;
    if (telemetry.isProcessing) {
      timer = window.setInterval(async () => {
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
          } else if (data.status === 'FINISHED') {
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
          } else if (data.status === 'ERROR') {
            setTelemetry(prev => ({ ...prev, isProcessing: false }));
            alert(`导出失败: ${data.error_msg}`);
          }
        } catch (e) {
          console.error(e);
        }
      }, 400);
    }
    return () => clearInterval(timer);
  }, [telemetry.isProcessing]);

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
          statusMessage: data.reason,
          isConfirmed480pRisk: false
        };
        setVideo(newVideo);
        setOutputVideoFile('');
        
        const dirRes = await fetch('/api/resolve_path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputFile: data.filePath, userDir: config.outputDir })
        });
        const dirData = await dirRes.json();
        setConfig(prev => ({ ...prev, fallbackDir: dirData.resolvedDir + '\\' }));
        setTelemetry(prev => ({ ...prev, totalFrames: data.total_frames || 60, currentFrame: 0 }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNativeSelectFolder = async () => {
    try {
      const res = await fetch('/api/native_select_folder', { method: 'POST' });
      const data = await res.json();
      if (data.selectedDir) {
        setConfig(prev => ({ ...prev, outputDir: data.selectedDir + '\\' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenExplorer = async () => {
    const target = config.outputDir || config.fallbackDir;
    await fetch('/api/open_folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: target })
    });
  };

  const handleStartExport = async () => {
    if (!video) return;
    setTelemetry(prev => ({ ...prev, isProcessing: true, isPaused: false }));
    try {
      await fetch('/api/start_export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputFile: video.filePath,
          userDir: config.outputDir,
          totalFrames: telemetry.totalFrames
        })
      });
    } catch (e) {
      alert('启动导出失败');
      setTelemetry(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const canExport = video !== null &&
    (video.status === 'RECOMMENDED' || (video.status === 'WARNING_480P' && video.isConfirmed480pRisk === true));

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0A0B0E] text-gray-100 font-sans select-none overflow-hidden antialiased">
      <TitleBar />

      <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-6xl w-full mx-auto pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VideoInputSection
            video={video}
            onVideoSelect={(v) => { setVideo(v); setOutputVideoFile(''); }}
            onConfirm480pRisk={() => video && setVideo({ ...video, isConfirmed480pRisk: !video.isConfirmed480pRisk })}
            onCallNativePicker={handleNativeSelectFile}
          />
          <ParameterPanel
            config={config}
            onChangeConfig={(partial) => setConfig(prev => ({ ...prev, ...partial }))}
          />
        </div>

        <PathConfigSection
          config={config}
          onChangeOutputDir={(dir) => setConfig(prev => ({ ...prev, outputDir: dir }))}
          onCallNativeFolderPicker={handleNativeSelectFolder}
          onOpenExplorer={handleOpenExplorer}
        />

        <HoverWipePlayer
          inputVideoPath={video?.filePath}
          outputVideoPath={outputVideoFile}
          isProcessing={telemetry.isProcessing}
        />

        <TelemetryBar
          telemetry={telemetry}
          onStartExport={handleStartExport}
          onPauseExport={() => setTelemetry(prev => ({ ...prev, isPaused: !prev.isPaused }))}
          canExport={canExport}
        />
      </main>
    </div>
  );
};
