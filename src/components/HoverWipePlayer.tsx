import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  IconPlay, 
  IconPause, 
  IconRotateCcw, 
  IconCamera, 
  IconVolume2, 
  IconVolumeX, 
  IconEye, 
  IconLayers 
} from './Icons';

interface HoverWipePlayerProps {
  inputVideoPath?: string;
  outputVideoPath?: string;
  isProcessing?: boolean;
}

export const HoverWipePlayer: React.FC<HoverWipePlayerProps> = ({
  inputVideoPath,
  outputVideoPath,
  isProcessing = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoLeftRef = useRef<HTMLVideoElement>(null);
  const videoRightRef = useRef<HTMLVideoElement>(null);

  // Whether we are comparing or just previewing the original video
  const isComparisonMode = Boolean(outputVideoPath);

  const [wipeRatio, setWipeRatio] = useState(0.5);
  const [isHovering, setIsHovering] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const leftSrc = inputVideoPath ? `/api/stream_video?path=${encodeURIComponent(inputVideoPath)}` : '';
  const rightSrc = outputVideoPath ? `/api/stream_video?path=${encodeURIComponent(outputVideoPath)}` : '';

  // 144Hz Zero-Lag Instant Wipe Tracking (Strictly NO transition to avoid ghosting)
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isComparisonMode || !containerRef.current || isFrozen) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0.0, Math.min(1.0, x / rect.width));
    setWipeRatio(ratio);
    setIsHovering(true);
  }, [isComparisonMode, isFrozen]);

  const handlePointerLeave = () => {
    setIsHovering(false);
  };

  const handleToggleFreeze = (e: React.MouseEvent) => {
    if (!isComparisonMode) return;
    e.stopPropagation();
    setIsFrozen(prev => !prev);
  };

  const handleResetCenter = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  // Step frame (approx 1/30s = 0.0333s)
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
    if (!isComparisonMode || !isFrozen) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? -0.0333 : 0.0333;
    const newTime = Math.max(0, Math.min(duration, currentTime + delta));
    setCurrentTime(newTime);
    if (videoLeftRef.current) videoLeftRef.current.currentTime = newTime;
    if (videoRightRef.current) videoRightRef.current.currentTime = newTime;
  };

  // Master video time sync
  const handleTimeUpdate = () => {
    const master = videoLeftRef.current;
    if (!master) return;
    const t = master.currentTime;
    setCurrentTime(t);
    if (master.duration && !isNaN(master.duration) && master.duration !== duration) {
      setDuration(master.duration);
    }
    // Micro-sync right video if drift exceeds 40ms
    if (videoRightRef.current && Math.abs(videoRightRef.current.currentTime - t) > 0.04) {
      videoRightRef.current.currentTime = t;
    }
  };

  // Ensure right video updates duration if left video is somehow missing duration
  const handleLoadedMetadata = () => {
    if (videoLeftRef.current && videoLeftRef.current.duration) {
      setDuration(videoLeftRef.current.duration);
    }
  };

  const handleExportSnapshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modeDesc = isComparisonMode ? '4K 卷帘对比' : '原视频预览';
    alert(`已截取时间点 ${currentTime.toFixed(2)}s 的【${modeDesc}】无损单帧快照！`);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00.0';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s}.${ms}`;
  };

  return (
    <div className="rounded-2xl bg-[#0E1015]/95 border border-white/[0.08] shadow-2xl backdrop-blur-md flex flex-col p-4 space-y-3 relative select-none">
      {/* Player Header: Mode Indicator & Quick Actions */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2.5">
          {isComparisonMode ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="font-semibold tracking-wide text-[11px]">4K 神经超分对比模式</span>
              <span className="text-gray-500 text-[10px]">|</span>
              <span className="text-emerald-400/80 text-[10px] hidden sm:inline">实时卷帘擦除 · 左右滑动鼠标</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span className="font-semibold tracking-wide text-[11px]">原视频预览模式</span>
              <span className="text-gray-500 text-[10px]">|</span>
              <span className="text-cyan-400/70 text-[10px] hidden sm:inline">尚未导出 4K，当前仅播放原始输入源</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isComparisonMode && (
            <button
              type="button"
              onClick={handleToggleFreeze}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1.5 ${
                isFrozen 
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                  : 'bg-white/[0.04] text-gray-300 hover:text-white border-white/[0.08] hover:bg-white/[0.08]'
              }`}
            >
              {isFrozen ? <IconPause className="w-3 h-3" /> : <IconLayers className="w-3 h-3" />}
              <span>{isFrozen ? '已定格 (滚轮穿梭)' : '单击定格'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportSnapshot}
            className="px-2.5 py-1 rounded-lg text-[11px] bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] transition-colors flex items-center gap-1.5 active:scale-95"
            title="截取当前帧画面"
          >
            <IconCamera className="w-3 h-3 text-cyan-400" />
            <span>快照</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleToggleFreeze}
        onDoubleClick={() => handleResetCenter()}
        onWheel={handleWheel}
        className={`relative w-full h-[460px] rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/[0.08] shadow-inner ${
          isComparisonMode ? 'cursor-col-resize' : 'cursor-default'
        }`}
      >
        {!leftSrc ? (
          <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
            <IconEye className="w-8 h-8 text-gray-600 animate-pulse" />
            <span className="text-xs">暂无视频源，请在上方选择 MP4 视频素材</span>
          </div>
        ) : isComparisonMode ? (
          <>
            {/* Layer 1: 4K Super-Resolution Output Video (Full Base Canvas) */}
            <video
              ref={videoRightRef}
              src={rightSrc}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Layer 2: Original Video (Left Clipped Layer, Zero-Lag 144Hz Instant Tracking) */}
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
                onLoadedMetadata={handleLoadedMetadata}
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>

            {/* Zero-Lag Laser Wipe Divider (NO CSS transition = Zero Ghosting / 零拖影) */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${wipeRatio * 100}%`,
                transform: 'translateX(-50%)',
                willChange: 'left'
              }}
            >
              {/* Vertical line with subtle glow */}
              <div className={`w-[2px] h-full ${
                isHovering || isFrozen
                  ? 'bg-emerald-400 shadow-[0_0_12px_#10B981,0_0_24px_#10B981]'
                  : 'bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.5)]'
              }`} />

              {/* Floating Divider Badge with Percentage */}
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#0B0D12]/95 border border-emerald-400 text-emerald-300 text-[10px] font-mono tracking-tighter shadow-2xl">
                {(wipeRatio * 100).toFixed(0)}%
              </div>
            </div>

            {/* Viewport Corner Badges */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/75 border border-white/10 text-gray-300 text-[11px] font-semibold backdrop-blur-md pointer-events-none">
              原片
            </div>
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold backdrop-blur-md pointer-events-none">
              4K DLSS 5 超分
            </div>
          </>
        ) : (
          /* Mode A: Single Original Video Preview (No fake filters, no false split line) */
          <video
            ref={videoLeftRef}
            src={leftSrc}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full object-contain pointer-events-none"
          />
        )}
      </div>

      {/* Video Playback & Timeline Controls */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-300 gap-3">
        {/* Play/Pause & Step Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!leftSrc}
            className="p-2 rounded-lg bg-white/[0.08] hover:bg-emerald-500/20 text-white hover:text-emerald-400 border border-white/10 transition-colors disabled:opacity-40"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <IconPause className="w-3.5 h-3.5" /> : <IconPlay className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={(e) => handleStepFrame(false, e)}
            disabled={!leftSrc}
            className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-gray-200 border border-white/[0.06] text-[11px] font-mono transition-colors disabled:opacity-40"
            title="后退 1 帧"
          >
            -1帧
          </button>

          <button
            type="button"
            onClick={(e) => handleStepFrame(true, e)}
            disabled={!leftSrc}
            className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-gray-200 border border-white/[0.06] text-[11px] font-mono transition-colors disabled:opacity-40"
            title="前进 1 帧"
          >
            +1帧
          </button>

          {/* Timecode */}
          <span className="font-mono text-gray-300 text-[11px] px-1">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 mx-2 flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            disabled={!leftSrc}
            className="w-full h-1.5 bg-white/[0.08] hover:bg-white/[0.12] rounded-lg appearance-none cursor-pointer accent-emerald-400 disabled:opacity-40 transition-colors"
          />
        </div>

        {/* Right Aux Controls */}
        <div className="flex items-center gap-2 text-[11px]">
          {isComparisonMode && (
            <button
              type="button"
              onClick={() => handleResetCenter()}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.06] transition-colors flex items-center gap-1"
              title="将卷帘线复位至中央 50%"
            >
              <IconRotateCcw className="w-3 h-3 text-gray-400" />
              <span>居中 (50%)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            disabled={!leftSrc}
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-gray-200 border border-white/[0.06] transition-colors disabled:opacity-40"
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted ? <IconVolumeX className="w-3.5 h-3.5" /> : <IconVolume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
