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
    filePath: 'E:\\comfyui\\dlss5-super-resolution\\tests\\fixtures\\synth_1080p_interview.mp4',
    fileName: 'synth_1080p_interview.mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 2.0,
    fps: 30,
    codec: 'H.264',
    fileSizeBytes: 301 * 1024,
    status: 'RECOMMENDED',
    statusMessage: '黄金推荐分辨率 (1080P)，已激活 DLSS 5 神经材质重构与 4K 硬件时序拉升。',
    isConfirmed480pRisk: false
  });

  const [config, setConfig] = useState<AppConfig>({
    qualityProfile: 'FAITHFUL',
    outputDir: '',
    fallbackDir: 'E:\\comfyui\\dlss5-super-resolution\\tests\\fixtures\\output_4k\\',
    namingTemplate: '{filename}_4K_DLSS5.mp4',
    enableFaststart: true,
    colorStandard: 'BT.709',
    deblockStrength: 'WEAK'
  });

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    isProcessing: false,
    isPaused: false,
    currentFrame: 0,
    totalFrames: 60,
    currentFps: 0,
    gpuLoadPercent: 78,
    vramUsedMb: 2840,
    vramTotalMb: 6144,
    etaSeconds: 0,
    circuitBreakerStatus: 'OPERATIONAL'
  });

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
              currentFps: data.current_fps
            }));
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
        const dirRes = await fetch('/api/resolve_path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputFile: data.filePath, userDir: config.outputDir })
        });
        const dirData = await dirRes.json();
        setConfig(prev => ({ ...prev, fallbackDir: dirData.resolvedDir + '\\' }));
        setTelemetry(prev => ({ ...prev, totalFrames: data.total_frames || 60 }));
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
            onVideoSelect={(v) => setVideo(v)}
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

        <HoverWipePlayer />

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
