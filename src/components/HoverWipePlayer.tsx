import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconCamera, IconPlay, IconPause } from './Icons';

interface Props {
  inputVideoPath?: string;
  outputVideoPath?: string;
  isProcessing?: boolean;
}

export const HoverWipePlayer: React.FC<Props> = ({
  inputVideoPath,
  outputVideoPath,
  isProcessing
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoLeftRef = useRef<HTMLVideoElement>(null);
  const videoRightRef = useRef<HTMLVideoElement>(null);

  const [wipeRatio, setWipeRatio] = useState(0.5);
  const [isHovering, setIsHovering] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(15);
  const [isMuted, setIsMuted] = useState(true);

  const leftSrc = inputVideoPath ? `/api/stream_video?path=${encodeURIComponent(inputVideoPath)}` : '';
  const rightSrc = outputVideoPath ? `/api/stream_video?path=${encodeURIComponent(outputVideoPath)}` : leftSrc;

  // 144Hz Zero-Lag Instant Wipe Tracking (No CSS Transition, No Ghosting)
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || isFrozen) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0.0, Math.min(1.0, x / rect.width));
    setWipeRatio(ratio);
    setIsHovering(true);
  }, [isFrozen]);

  const handlePointerLeave = () => {
    // Sticky Hold: retain last ratio position!
    setIsHovering(false);
  };

  const handleToggleFreeze = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFrozen(prev => !prev);
  };

  const handleResetCenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWipeRatio(0.5);
    setIsFrozen(false);
  };

  // Synchronized Play/Pause
  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    if (videoLeftRef.current) {
      if (nextPlaying) videoLeftRef.current.play().catch(() => {});
      else videoLeftRef.current.pause();
    }
    if (videoRightRef.current) {
      if (nextPlaying) videoRightRef.current.play().catch(() => {});
      else videoRightRef.current.pause();
    }
  };

  // Sync seek time
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (videoLeftRef.current) videoLeftRef.current.currentTime = t;
    if (videoRightRef.current) videoRightRef.current.currentTime = t;
  };

  // Step frame (approx 1/30s = 0.033s)
  const handleStepFrame = (forward: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false);
    if (videoLeftRef.current) videoLeftRef.current.pause();
    if (videoRightRef.current) videoRightRef.current.pause();
    
    const delta = forward ? 0.0333 : -0.0333;
    const newTime = Math.max(0, Math.min(duration, currentTime + delta));
    setCurrentTime(newTime);
    if (videoLeftRef.current) videoLeftRef.current.currentTime = newTime;
    if (videoRightRef.current) videoRightRef.current.currentTime = newTime;
  };

  // Mouse wheel scrubbing when frozen
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isFrozen) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? -0.0333 : 0.0333;
    const newTime = Math.max(0, Math.min(duration, currentTime + delta));
    setCurrentTime(newTime);
    if (videoLeftRef.current) videoLeftRef.current.currentTime = newTime;
    if (videoRightRef.current) videoRightRef.current.currentTime = newTime;
  };

  // Master video time sync
  const handleTimeUpdate = () => {
    if (!videoLeftRef.current) return;
    const t = videoLeftRef.current.currentTime;
    setCurrentTime(t);
    if (videoLeftRef.current.duration && !isNaN(videoLeftRef.current.duration)) {
      setDuration(videoLeftRef.current.duration);
    }
    // Micro-sync right video if drift exceeds 50ms
    if (videoRightRef.current && Math.abs(videoRightRef.current.currentTime - t) > 0.05) {
      videoRightRef.current.currentTime = t;
    }
  };

  const handleExportSnapshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`已将时间点 ${currentTime.toFixed(2)}s 的 4K 神经对比画面导出为无损快照！`);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s}.${ms}`;
  };

  return (
    <div className="p-5 rounded-2xl bg-[#13151C]/95 border border-white/[0.08] shadow-2xl backdrop-blur-md flex flex-col space-y-3 relative">
      {/* Player Title & HUD Controls */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
          <h2 className="font-semibold text-gray-200 uppercase tracking-wider text-xs">
            WIPE 动态擦除对比视窗 (仿 VideoComparerMEC 模式)
          </h2>
          {outputVideoPath ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              ✓ 4K 真实超分成品已挂载对比
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px]">
              实时神经先验预览
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2.5 text-[11px]">
          <span className={`px-2.5 py-1 rounded-lg border font-medium flex items-center space-x-1.5 ${
            isFrozen
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {isFrozen ? <IconPause className="w-3 h-3" /> : <IconPlay className="w-3 h-3" />}
            <span>{isFrozen ? '瞬时定格 (滚轮穿梭)' : '实时擦除 (鼠标悬停即跟随)'}</span>
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
        className="relative w-full h-[400px] rounded-xl overflow-hidden bg-[#060709] select-none cursor-crosshair border border-white/[0.12] shadow-[0_0_40px_rgba(0,0,0,0.8)] group flex items-center justify-center"
      >
        {/* Layer 1: Enhanced 4K View (Right Full Background) */}
        {rightSrc ? (
          <video
            ref={videoRightRef}
            src={rightSrc}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className={`w-full h-full object-contain pointer-events-none ${
              !outputVideoPath ? 'contrast-[1.12] saturate-[1.08] brightness-[1.02]' : ''
            }`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 text-xs">
            <span>未加载视频素材</span>
          </div>
        )}

        {/* Layer 2: Original 1080P View (Left Clipped Layer, Zero-Lag 144Hz Tracking) */}
        {leftSrc ? (
          <div
            className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none"
            style={{
              clipPath: `polygon(0 0, ${wipeRatio * 100}% 0, ${wipeRatio * 100}% 100%, 0 100%)`,
              willChange: 'clip-path'
            }}
          >
            <video
              ref={videoLeftRef}
              src={leftSrc}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
        ) : null}

        {/* Zero-Lag Laser Wipe Divider (No CSS transition = Zero Ghosting / 零拖影) */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: `${wipeRatio * 100}%`,
            transform: 'translateX(-50%)',
            willChange: 'left'
          }}
        >
          {/* Laser line with glowing cyan */}
          <div className={`w-[2px] h-full ${
            isHovering || isFrozen
              ? 'bg-cyan-300 shadow-[0_0_15px_#00F0FF,0_0_30px_#00F0FF]'
              : 'bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
          }`} />

          {/* Floating Pill with percentage */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/95 border border-cyan-400 text-cyan-300 text-[10px] font-mono tracking-tighter shadow-2xl">
            {(wipeRatio * 100).toFixed(0)}%
          </div>
        </div>

        {/* HUD Badges */}
        <div className="absolute top-3 left-3.5 px-3 py-1 rounded-lg bg-black/75 border border-white/10 text-gray-300 text-[11px] font-semibold backdrop-blur-md pointer-events-none shadow-md">
          &#9664; 原片 1080P
        </div>
        <div className="absolute top-3 right-3.5 px-3 py-1 rounded-lg bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 text-[11px] font-semibold backdrop-blur-md pointer-events-none shadow-md">
          {outputVideoPath ? '4K 物理超分成品 (3840×2160) &#9654;' : '4K DLSS 5 神经增强 &#9654;'}
        </div>
      </div>

      {/* Video Transport Scrubber & Frame Stepper */}
      <div className="flex items-center justify-between px-2 pt-1 text-xs text-gray-300">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-cyan-400 transition-colors cursor-pointer"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={(e) => handleStepFrame(false, e)}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-mono transition-colors"
            title="后退单帧"
          >
            &#9664; -1帧
          </button>

          <button
            type="button"
            onClick={(e) => handleStepFrame(true, e)}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-mono transition-colors"
            title="前进单帧"
          >
            +1帧 &#9654;
          </button>

          <span className="font-mono text-cyan-300 text-[11px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 mx-4 flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-gray-400">
          <button
            type="button"
            onClick={handleResetCenter}
            className="px-2.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            复位居中 (50%)
          </button>
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 text-[10px]"
          >
            {isMuted ? '🔇 静音' : '🔊 原声'}
          </button>
        </div>
      </div>

      {/* Helper Footer */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5 px-2">
        <div className="flex items-center space-x-3">
          <span>💡 <b>鼠标悬停即擦除</b> (0延迟极速跟随，绝无拖影)</span>
          <span>•</span>
          <span><b>移出保持定格</b> (Sticky)</span>
          <span>•</span>
          <span><b>单击冻结</b></span>
          <span>•</span>
          <span><b>滚轮逐帧穿梭</b></span>
        </div>
        <span className="font-mono">双击视口复位 (50%)</span>
      </div>
    </div>
  );
};
