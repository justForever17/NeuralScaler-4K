import React from 'react';
import { IconShieldCheck } from './Icons';

export const TitleBar: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-4 py-2.5 select-none bg-[#0D0E12]/95 border-b border-white/[0.08] backdrop-blur-xl text-gray-300 text-xs z-50">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-black text-[10px] shadow-[0_0_12px_rgba(0,240,255,0.4)]">
          N
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="font-semibold tracking-wide text-white font-sans text-[13px]">
            NeuralScaler <span className="font-light text-cyan-400">DLSS 5</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">v2.2-Refined</span>
        </div>
      </div>

      {/* Center VRAM & Hardware Status Badge */}
      <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] shadow-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]"></span>
        <span className="font-medium tracking-tight">4GB~8GB 显存保护模式 (&le;3.4GB 封顶)</span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center space-x-1 text-gray-400">
        <button className="w-8 h-7 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors text-xs text-gray-300">
          &#8212;
        </button>
        <button className="w-8 h-7 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors text-xs text-gray-300">
          &#9633;
        </button>
        <button className="w-8 h-7 flex items-center justify-center hover:bg-rose-600 hover:text-white rounded-md transition-colors text-sm">
          &times;
        </button>
      </div>
    </header>
  );
};
