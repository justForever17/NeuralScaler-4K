import React, { useState, useRef, useCallback } from 'react';
import { IconCamera, IconPlay, IconPause } from './Icons';

export const HoverWipePlayer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wipeRatio, setWipeRatio] = useState(0.5);
  const [isHovering, setIsHovering] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frameIndex, setFrameIndex] = useState(42);
  const [isLazyActive, setIsLazyActive] = useState(false);

  // 144Hz decoupled mouse hover tracking
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0.0, Math.min(1.0, x / rect.width));
    setWipeRatio(ratio);
    setIsHovering(true);
  }, []);

  const handlePointerLeave = () => {
    // Sticky Hold: retain last position!
    setIsHovering(false);
  };

  const handleToggleFreeze = () => {
    setIsFrozen(prev => !prev);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isFrozen) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setFrameIndex(f => Math.max(0, f - 1));
    } else {
      setFrameIndex(f => f + 1);
    }
  };

  const handleResetCenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWipeRatio(0.5);
  };

  const handleExportSnapshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`已将第 ${frameIndex} 帧当前擦除对比视图导出为无损 PNG 快照！`);
  };

  return (
    <div className="p-5 rounded-2xl bg-[#13151C]/90 border border-white/[0.08] shadow-2xl backdrop-blur-md flex flex-col space-y-3 relative">
      {/* Player Title & HUD Controls */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
          <h2 className="font-semibold text-gray-200 uppercase tracking-wider text-xs">
            Wipe 动态擦除对比视窗 (效仿 VideoComparerMEC 模式)
          </h2>
        </div>
        <div className="flex items-center space-x-2.5 text-[11px]">
          <span className={`px-2.5 py-1 rounded-lg border font-medium flex items-center space-x-1.5 ${
            isFrozen
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {isFrozen ? <IconPause className="w-3 h-3" /> : <IconPlay className="w-3 h-3" />}
            <span>{isFrozen ? '瞬时定格模式 (滚轮穿梭帧)' : '实时擦除中 (鼠标悬停即跟随)'}</span>
          </span>

          <button
            type="button"
            onClick={handleExportSnapshot}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <IconCamera className="w-3.5 h-3.5 text-cyan-400" />
            <span>导出单帧快照</span>
          </button>
        </div>
      </div>

      {/* 16:9 Interactive Canvas Viewport */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleToggleFreeze}
        onDoubleClick={handleResetCenter}
        onWheel={handleWheel}
        className="relative w-full h-[360px] rounded-xl overflow-hidden bg-black select-none cursor-crosshair border border-white/[0.12] shadow-[0_0_40px_rgba(0,0,0,0.8)] group"
      >
        {/* Lazy Overlay (Saves VRAM) */}
        {!isLazyActive ? (
          <div
            onClick={(e) => { e.stopPropagation(); setIsLazyActive(true); }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md cursor-pointer hover:bg-black/60 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.4)] mb-3 group-hover:scale-105 transition-transform">
              <IconPlay className="w-6 h-6 ml-0.5" />
            </div>
            <span className="text-sm text-gray-100 font-semibold tracking-wide">
              点击激活硬解对比预览 (惰性低功耗架构)
            </span>
            <span className="text-xs text-gray-400 mt-1">
              空闲时不常驻分配显存表面，避免与批处理导出争抢硬件会话
            </span>
          </div>
        ) : null}

        {/* Layer 1: Enhanced 4K View (Right Full Background) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#0A0F1D] flex flex-col items-center justify-center">
          <div className="text-center space-y-2 p-6 max-w-md">
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 tracking-wider filter drop-shadow">
              4K DLSS 5
            </div>
            <div className="text-xs text-cyan-200 font-medium">
              神经材质生成 • 次表面散射透光 • 真实微观毛孔发丝
            </div>
            <div className="inline-block px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[11px] text-cyan-400 font-mono">
              Frame #{frameIndex} | OFA Hardware Dense Motion Vectors
            </div>
          </div>
        </div>

        {/* Layer 2: Original 1080P View (Left Clipped Layer) */}
        <div
          className="absolute inset-0 bg-gradient-to-tr from-[#111115] via-[#18181D] to-[#22222A] flex flex-col items-center justify-center overflow-hidden"
          style={{ clipPath: `polygon(0 0, ${wipeRatio * 100}% 0, ${wipeRatio * 100}% 100%, 0 100%)` }}
        >
          <div className="text-center space-y-2 p-6 max-w-md">
            <div className="text-4xl font-extrabold text-gray-400 tracking-wider">
              原始 1080P
            </div>
            <div className="text-xs text-gray-400 font-medium">
              未经超分原片 • 存在宏块压缩涂抹与高频细节缺失
            </div>
            <div className="inline-block px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] text-gray-400 font-mono">
              Frame #{frameIndex} | Native Pixel Grid
            </div>
          </div>
        </div>

        {/* Luminous Divider Line (The Laser Wipe Bar) */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none transition-all duration-75"
          style={{
            left: `${wipeRatio * 100}%`,
            transform: 'translateX(-50%)'
          }}
        >
          {/* Laser line with cyan glow */}
          <div className={`w-[2px] h-full ${
            isHovering
              ? 'bg-cyan-300 shadow-[0_0_15px_#00F0FF,0_0_30px_#00F0FF]'
              : 'bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
          }`} />

          {/* Floating Pill with percentage */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/90 border border-cyan-400/80 text-cyan-300 text-[10px] font-mono tracking-tighter shadow-2xl">
            {(wipeRatio * 100).toFixed(0)}%
          </div>
        </div>

        {/* HUD Badges */}
        <div className="absolute top-3 left-3.5 px-3 py-1 rounded-lg bg-black/70 border border-white/10 text-gray-300 text-[11px] font-semibold backdrop-blur-md pointer-events-none">
          &#9664; 原片 1080P
        </div>
        <div className="absolute top-3 right-3.5 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold backdrop-blur-md pointer-events-none">
          4K DLSS 5 增强 &#9654;
        </div>
      </div>

      {/* Helper Footer */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
        <div className="flex items-center space-x-3">
          <span>💡 <b>鼠标悬停即擦除</b> (免点击)</span>
          <span>•</span>
          <span><b>移出保持定格</b> (Sticky)</span>
          <span>•</span>
          <span><b>单击冻结</b></span>
          <span>•</span>
          <span><b>滚轮穿梭帧</b></span>
        </div>
        <span className="text-gray-500 font-mono">双击视口复位 (50%)</span>
      </div>
    </div>
  );
};
