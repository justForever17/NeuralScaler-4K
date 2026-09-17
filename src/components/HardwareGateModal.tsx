import React from 'react';
import { GpuDevice } from '../types';
import { IconAlertTriangle, IconShieldCheck, IconZap } from './Icons';

interface HardwareGateModalProps {
  isOpen: boolean;
  gpu: GpuDevice | null;
  supportedGpus: GpuDevice[];
  onSelectGpu: (id: string) => void;
  onClose: () => void;
}

export const HardwareGateModal: React.FC<HardwareGateModalProps> = ({
  isOpen,
  gpu,
  supportedGpus,
  onSelectGpu,
  onClose,
}) => {
  if (!isOpen || !gpu) return null;

  const isVendorValid = gpu.vendor === 'NVIDIA' || gpu.vendor === 'AMD';
  const isVramValid = gpu.vram_mb >= 2048;
  const bestSupported = supportedGpus.length > 0 ? supportedGpus[0] : null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-[#14161F] border border-red-500/30 dark:border-red-500/30 rounded-2xl shadow-2xl p-6 text-gray-800 dark:text-gray-100 flex flex-col gap-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-sm">
            <IconAlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <span>硬件设备准入门禁拦截</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              检测到当前设备不满足超分运行标准，已拒绝生成
            </p>
          </div>
        </div>

        {/* Banner */}
        <div className="p-3 rounded-xl bg-red-500/[0.08] dark:bg-red-500/[0.12] border border-red-500/20 text-xs text-red-700 dark:text-red-300 leading-relaxed font-medium">
          {gpu.rejection_reason || '当前显卡架构或显存容量不符合 NeuralScaler 4K 运行要求，已拒绝执行超分生成任务。'}
        </div>

        {/* Hardware Diagnostics Matrix */}
        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] p-3 text-xs flex flex-col gap-2.5 font-mono">
          <div className="flex justify-between items-center pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-gray-500 dark:text-gray-400 font-sans">当前检测显卡:</span>
            <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[220px]" title={gpu.name}>
              {gpu.name}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-gray-500 dark:text-gray-400 font-sans">芯片厂商架构:</span>
            <div className="flex items-center gap-1.5">
              <span className={isVendorValid ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
                {gpu.vendor_cn || gpu.vendor}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded dark:bg-white/[0.06] bg-black/[0.06] text-gray-400">
                {isVendorValid ? '符合' : '不兼容 (限 N卡/A卡)'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 font-sans">独立专用显存:</span>
            <div className="flex items-center gap-1.5">
              <span className={isVramValid ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
                {(gpu.vram_mb / 1024).toFixed(1)} GB ({gpu.vram_mb} MB)
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded dark:bg-white/[0.06] bg-black/[0.06] text-gray-400">
                {isVramValid ? '达标' : '不达标 (最少需 2GB)'}
              </span>
            </div>
          </div>
        </div>

        {/* Requirements Explainer */}
        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
          <IconShieldCheck className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
          <span>
            系统最低运行标准：配备至少 <strong className="text-gray-700 dark:text-gray-300">2GB (2048 MB)</strong> 独立专用显存的 <strong className="text-gray-700 dark:text-gray-300">NVIDIA</strong> 或 <strong className="text-gray-700 dark:text-gray-300">AMD</strong> 显卡。
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-2 pt-2 border-t border-black/[0.08] dark:border-white/[0.08]">
          {bestSupported && (
            <button
              onClick={() => {
                onSelectGpu(bestSupported.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <IconZap className="w-3.5 h-3.5" />
              <span>切换至 {bestSupported.vendor === 'NVIDIA' ? 'N卡' : 'A卡'} ({bestSupported.name.slice(0, 18)}...)</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-black/[0.05] hover:bg-black/[0.1] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
