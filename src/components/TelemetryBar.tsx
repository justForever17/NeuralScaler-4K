import React from 'react';
import { TelemetryState } from '../types';
import { IconZap, IconCpu } from './Icons';

interface TelemetryBarProps {
  telemetry: TelemetryState;
  onStartExport: () => void;
  canExport: boolean;
  isGpuSupported?: boolean;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  telemetry,
  onStartExport,
  canExport,
  isGpuSupported = true
}) => {
  const percent = telemetry.totalFrames > 0
    ? Math.min(100, Math.round((telemetry.currentFrame / telemetry.totalFrames) * 100))
    : 0;

  return (
    <footer className="dark:bg-[#12141A]/95 bg-white/95 backdrop-blur-md border dark:border-white/[0.08] border-black/[0.08] rounded-xl px-3.5 h-12 shadow-sm flex flex-nowrap items-center justify-between gap-3 shrink-0 overflow-hidden">
      {/* Left: Hardware Telemetry Metrics */}
      <div className="flex items-center gap-3 text-xs shrink-0">
        <div className="flex items-center gap-1.5 dark:text-gray-400 text-gray-500 whitespace-nowrap">
          <IconCpu className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span className="dark:text-gray-300 text-gray-700 font-medium">硬件状态:</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <div className="px-2 py-0.5 rounded dark:bg-white/[0.04] bg-black/[0.04] border dark:border-white/[0.06] border-black/[0.06] dark:text-gray-300 text-gray-700 whitespace-nowrap shadow-sm">
            GPU: <span className="dark:text-white text-gray-900 font-semibold">{telemetry.gpuLoadPercent}%</span>
          </div>

          <div className="px-2 py-0.5 rounded dark:bg-white/[0.04] bg-black/[0.04] border dark:border-white/[0.06] border-black/[0.06] dark:text-gray-300 text-gray-700 whitespace-nowrap shadow-sm">
            显存: <span className="text-cyan-500 dark:text-cyan-400 font-semibold">{(telemetry.vramUsedMb / 1024).toFixed(1)}</span> / 8.0 GB
          </div>

          <div className="px-2 py-0.5 rounded dark:bg-white/[0.04] bg-black/[0.04] border dark:border-white/[0.06] border-black/[0.06] dark:text-gray-300 text-gray-700 whitespace-nowrap shadow-sm">
            渲染: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{telemetry.currentFps.toFixed(1)}</span> FPS
          </div>
        </div>
      </div>

      {/* Middle: Export Progress Bar (Only visible or emphasized when processing) */}
      {telemetry.isProcessing ? (
        <div className="flex-1 max-w-sm mx-2 flex flex-col gap-1 min-w-[120px]">
          <div className="flex justify-between items-center text-[10px] dark:text-gray-400 text-gray-600 font-mono">
            <span>超分进度</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{percent}% ({telemetry.currentFrame}/{telemetry.totalFrames} 帧)</span>
          </div>
          <div className="w-full h-1.5 rounded-full dark:bg-white/[0.06] bg-black/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1"></div>
      )}

      {/* Right: Core Action Button with Hardware Gate Guard */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={!canExport || telemetry.isProcessing}
          onClick={onStartExport}
          className={`px-5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 shadow-sm shrink-0 whitespace-nowrap active:scale-[0.98] ${
            canExport && !telemetry.isProcessing
              ? (!isGpuSupported 
                  ? 'bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-white font-bold shadow-[0_2px_8px_rgba(239,68,68,0.3)] cursor-pointer border border-red-400/50' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.4)] cursor-pointer border border-emerald-400/40')
              : telemetry.isProcessing
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 cursor-wait'
              : 'dark:bg-white/[0.05] bg-black/[0.05] text-gray-400 dark:text-gray-500 border dark:border-white/[0.06] border-black/[0.06] cursor-not-allowed'
          }`}
        >
          <IconZap className={`w-4 h-4 shrink-0 ${telemetry.isProcessing ? 'animate-bounce text-emerald-400' : (!isGpuSupported ? 'text-white' : 'text-black')}`} />
          <span>
            {telemetry.isProcessing 
              ? `4K 渲染中 (${percent}%)...` 
              : (!isGpuSupported ? '开始超分 (显卡门禁受限)' : '开始 4K 神经超分导出')}
          </span>
        </button>
      </div>
    </footer>
  );
};
