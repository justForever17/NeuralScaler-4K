import React from 'react';
import { TelemetryState } from '../types';
import { IconZap, IconCpu } from './Icons';

interface TelemetryBarProps {
  telemetry: TelemetryState;
  onStartExport: () => void;
  canExport: boolean;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  telemetry,
  onStartExport,
  canExport
}) => {
  const percent = telemetry.totalFrames > 0
    ? Math.min(100, Math.round((telemetry.currentFrame / telemetry.totalFrames) * 100))
    : 0;

  return (
    <footer className="bg-[#12141A]/90 backdrop-blur-md border border-white/[0.08] rounded-xl px-4 py-3 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Left: Hardware Telemetry Metrics */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-gray-400">
          <IconCpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-gray-300 font-medium">硬件状态:</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-gray-300">
            GPU: <span className="text-white font-semibold">{telemetry.gpuLoadPercent}%</span>
          </div>

          <div className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-gray-300">
            显存: <span className="text-cyan-400 font-semibold">{(telemetry.vramUsedMb / 1024).toFixed(1)}</span> / 8.0 GB
          </div>

          <div className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-gray-300">
            渲染: <span className="text-emerald-400 font-semibold">{telemetry.currentFps.toFixed(1)}</span> FPS
          </div>
        </div>
      </div>

      {/* Middle: Export Progress Bar (Only visible or emphasized when processing or finished) */}
      {telemetry.isProcessing && (
        <div className="flex-1 max-w-md mx-2 flex flex-col gap-1 w-full">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
            <span>超分渲染进度</span>
            <span className="text-emerald-400 font-bold">{percent}% ({telemetry.currentFrame}/{telemetry.totalFrames} 帧)</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Right: Core Action CTA Button */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          disabled={!canExport || telemetry.isProcessing}
          onClick={onStartExport}
          className={`px-6 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 shadow-md ${
            canExport && !telemetry.isProcessing
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold shadow-emerald-500/20 hover:shadow-emerald-500/35 cursor-pointer active:scale-95'
              : telemetry.isProcessing
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-wait'
              : 'bg-white/[0.05] text-gray-500 border border-white/[0.06] cursor-not-allowed'
          }`}
        >
          <IconZap className={`w-4 h-4 ${telemetry.isProcessing ? 'animate-bounce text-emerald-400' : ''}`} />
          <span>
            {telemetry.isProcessing 
              ? `4K 渲染中 (${percent}%)...` 
              : '⚡ 开始 4K 神经超分导出'}
          </span>
        </button>
      </div>
    </footer>
  );
};
