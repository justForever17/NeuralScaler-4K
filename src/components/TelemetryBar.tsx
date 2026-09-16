import React from 'react';
import { TelemetryState } from '../types';
import { IconZap, IconShieldCheck, IconPause, IconPlay } from './Icons';

interface Props {
  telemetry: TelemetryState;
  onStartExport: () => void;
  onPauseExport: () => void;
  canExport: boolean;
}

export const TelemetryBar: React.FC<Props> = ({ telemetry, onStartExport, onPauseExport, canExport }) => {
  const percent = telemetry.totalFrames > 0
    ? Math.round((telemetry.currentFrame / telemetry.totalFrames) * 100)
    : 0;

  return (
    <div className="p-5 rounded-2xl bg-[#13151C]/95 border border-white/[0.08] shadow-2xl backdrop-blur-xl flex flex-col space-y-3.5">
      {/* Upper Status Grid */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-gray-100 text-xs tracking-wider uppercase">批处理与硬件遥测监控</span>
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px]">
            <IconShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>四级熔断看门狗: 运行正常</span>
          </div>
        </div>

        <div className="flex items-center space-x-5 text-gray-400 text-xs font-mono">
          <div>GPU 负载: <span className="text-gray-100 font-bold">{telemetry.gpuLoadPercent}%</span></div>
          <div>显存占用: <span className="text-cyan-400 font-bold">{(telemetry.vramUsedMb / 1024).toFixed(1)} GB</span> / 6.0 GB</div>
          <div>处理速度: <span className="text-emerald-400 font-bold">{telemetry.currentFps.toFixed(1)} fps</span></div>
          <div>预计剩余: <span className="text-gray-100 font-bold">00:01:15</span></div>
        </div>
      </div>

      {/* Shimmer Glowing Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden p-0.5 border border-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.5)]"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Lower Actions & Counters */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-gray-300 font-mono">
          进度: <span className="text-cyan-400 font-bold text-sm">{percent}%</span> ({telemetry.currentFrame} / {telemetry.totalFrames} 帧)
        </div>

        <div className="flex items-center space-x-3">
          {telemetry.isProcessing ? (
            <button
              type="button"
              onClick={onPauseExport}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              {telemetry.isPaused ? <IconPlay className="w-3.5 h-3.5" /> : <IconPause className="w-3.5 h-3.5" />}
              <span>{telemetry.isPaused ? '继续处理' : '暂停导出'}</span>
            </button>
          ) : null}

          <button
            type="button"
            disabled={!canExport || telemetry.isProcessing}
            onClick={onStartExport}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-2 shadow-lg ${
              canExport && !telemetry.isProcessing
                ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-cyan-500/25 hover:shadow-cyan-500/40 cursor-pointer active:scale-95'
                : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            <IconZap className="w-4 h-4" />
            <span>⚡ 开始 4K 神经超分导出</span>
          </button>
        </div>
      </div>
    </div>
  );
};
