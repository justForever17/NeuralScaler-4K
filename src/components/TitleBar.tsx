import React from 'react';
import { 
  IconAppLogo, 
  IconGpu, 
  IconSun, 
  IconMoon, 
  IconMonitor,
  IconChevronDown 
} from './Icons';
import { GpuDevice, ThemeMode } from '../types';

interface TitleBarProps {
  gpus: GpuDevice[];
  selectedGpuId: string;
  onSelectGpu: (id: string) => void;
  themeMode: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
  onOpenGateModal?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  gpus,
  selectedGpuId,
  onSelectGpu,
  themeMode,
  onToggleTheme,
  onOpenGateModal,
}) => {
  const activeGpu = gpus.find(g => g.id === selectedGpuId) || gpus[0];

  return (
    <header className="flex flex-nowrap items-center justify-between px-3.5 h-10 select-none bg-white/95 dark:bg-[#0D0E14]/95 border-b border-black/[0.08] dark:border-white/[0.08] backdrop-blur-xl text-gray-700 dark:text-gray-300 text-xs z-50 shrink-0 overflow-hidden shadow-sm">
      {/* Brand & Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <IconAppLogo className="w-5 h-5 shadow-sm shrink-0" />
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold tracking-wide dark:text-white text-gray-900 font-sans text-xs">
            NeuralScaler <span className="font-semibold text-emerald-400">4K</span>
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono dark:bg-white/[0.06] bg-black/[0.05] dark:text-gray-400 text-gray-600 border dark:border-white/[0.06] border-black/[0.06]">
            DLSS 5
          </span>
          <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">v2.3</span>
        </div>
      </div>

      {/* Center: Real Physical GPU Accelerator Dropdown with Gate Status */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all ${
          activeGpu?.is_supported
            ? 'dark:bg-white/[0.04] bg-black/[0.04] dark:border-white/[0.08] border-black/[0.08]'
            : 'dark:bg-red-500/[0.08] bg-red-500/[0.08] dark:border-red-500/30 border-red-500/30 text-red-500'
        }`}>
          <IconGpu className={`w-3.5 h-3.5 shrink-0 ${
            activeGpu?.is_supported
              ? (activeGpu?.vendor === 'NVIDIA' ? 'text-emerald-400' : 'text-cyan-400')
              : 'text-red-500'
          }`} />
          <span className="text-[11px] text-gray-400 dark:text-gray-400 text-gray-500 whitespace-nowrap">加速引擎:</span>
          
          <div className="relative inline-block">
            <select
              value={selectedGpuId}
              onChange={(e) => onSelectGpu(e.target.value)}
              className="appearance-none text-[11px] dark:bg-transparent bg-transparent text-gray-200 dark:text-gray-200 text-gray-800 pr-5 py-0.5 focus:outline-none cursor-pointer font-medium"
            >
              {gpus.map((gpu) => (
                <option key={gpu.id} value={gpu.id} className="dark:bg-[#181A22] bg-white dark:text-gray-200 text-gray-800">
                  {gpu.name} ({roundVram(gpu.vram_mb)}GB · {gpu.is_supported ? (gpu.vendor === 'NVIDIA' ? 'N卡支持' : 'A卡支持') : '门禁拦截'})
                </option>
              ))}
            </select>
            <IconChevronDown className="w-3 h-3 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-0.5 ${
            activeGpu?.is_supported ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
          }`} />

          {!activeGpu?.is_supported && (
            <button
              type="button"
              onClick={onOpenGateModal}
              className="text-[10px] text-red-500 font-bold px-1 py-0.2 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors cursor-pointer"
              title="查看门禁拦截详情"
            >
              门禁拦截
            </button>
          )}
        </div>
      </div>

      {/* Right: Theme Switcher (Dark / Light / Auto) */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="flex items-center p-0.5 rounded-lg dark:bg-white/[0.04] bg-black/[0.04] border dark:border-white/[0.08] border-black/[0.08]">
          <button
            type="button"
            onClick={() => onToggleTheme('dark')}
            className={`p-1 rounded-md transition-colors ${
              themeMode === 'dark' 
                ? 'dark:bg-white/[0.12] bg-black/[0.1] text-emerald-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="深色模式 (Dark Mode)"
          >
            <IconMoon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onToggleTheme('light')}
            className={`p-1 rounded-md transition-colors ${
              themeMode === 'light' 
                ? 'dark:bg-white/[0.12] bg-black/[0.1] text-amber-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="浅色模式 (Light Mode)"
          >
            <IconSun className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onToggleTheme('auto')}
            className={`p-1 rounded-md transition-colors ${
              themeMode === 'auto' 
                ? 'dark:bg-white/[0.12] bg-black/[0.1] text-cyan-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
            title="跟随系统设置 (Auto Sync)"
          >
            <IconMonitor className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

function roundVram(mb: number): string {
  if (!mb) return '1.0';
  return (mb / 1024).toFixed(1);
}
