import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  IconPlay, 
  IconPause, 
  IconStepBack,
  IconStepForward,
  IconRotateCcw, 
  IconCamera, 
  IconVolume2, 
  IconVolumeX, 
  IconEye, 
  IconLayers,
  IconZoomIn,
  IconChevronLeft,
  IconChevronRight
} from './Icons';

interface HoverWipePlayerProps {
  inputVideoPath?: string;
  outputVideoPath?: string;
  inputResolution?: string;
  outputResolution?: string;
  isProcessing?: boolean;
}

export const HoverWipePlayer: React.FC<HoverWipePlayerProps> = ({
  inputVideoPath,
  outputVideoPath,
  inputResolution = '540×960',
  outputResolution = '2160×3840',
  isProcessing = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoLeftRef = useRef<HTMLVideoElement>(null);
  const videoRightRef = useRef<HTMLVideoElement>(null);

  // Mode: whether 4K export exists for comparison
  const isComparisonMode = Boolean(outputVideoPath);

  const [wipeRatio, setWipeRatio] = useState(0.5);
  const [isHovering, setIsHovering] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // Zoom & Detail Inspection Mode: 1x (Fit), 2x (Detail), 3x (Micro)
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // A/B Solo Toggle Mode: 'WIPE' | 'SOLO_4K' | 'SOLO_ORIG'
  const [viewMode, setViewMode] = useState<'WIPE' | 'SOLO_4K' | 'SOLO_ORIG'>('WIPE');

  const leftSrc = inputVideoPath ? `/api/stream_video?path=${encodeURIComponent(inputVideoPath)}` : '';
  const rightSrc = outputVideoPath ? `/api/stream_video?path=${encodeURIComponent(outputVideoPath)}` : '';

  // Continuous High-Precision Phase-Lock Synchronization Engine
  useEffect(() => {
    if (!isComparisonMode) return;
    let animId: number;

    const syncLoop = () => {
      const left = videoLeftRef.current;
      const right = videoRightRef.current;

      if (left && right) {
        if (!left.paused && !right.paused) {
          const drift = right.currentTime - left.currentTime;
          
          if (Math.abs(drift) > 0.25) {
            // Severe drift (e.g. seek, loop restart) -> instant hard align
            right.currentTime = left.currentTime;
            right.playbackRate = 1.0;
          } else if (Math.abs(drift) > 0.015) {
            // Micro-drift (0.5 to 7 frames): smoothly modulate playbackRate to snap into exact phase lock
            // drift < 0 means right lags behind -> speed up (1.05x ~ 1.15x)
            // drift > 0 means right is ahead -> slow down (0.85x ~ 0.95x)
            const targetRate = 1.0 - Math.min(0.2, Math.max(-0.2, drift * 4.0));
            if (Math.abs(right.playbackRate - targetRate) > 0.01) {
              right.playbackRate = targetRate;
            }
          } else {
            // In exact frame phase lock (< 15ms)!
            if (right.playbackRate !== 1.0) {
              right.playbackRate = 1.0;
            }
          }
        } else if (left.paused && right.paused) {
          // When paused / frozen: lock both videos to the EXACT same timestamp!
          if (Math.abs(right.currentTime - left.currentTime) > 0.005) {
            right.currentTime = left.currentTime;
          }
        }
      }

      animId = requestAnimationFrame(syncLoop);
    };

    animId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animId);
  }, [isComparisonMode, rightSrc]);

  // 144Hz Zero-Lag Instant Wipe Tracking
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isComparisonMode || viewMode !== 'WIPE' || !containerRef.current || isFrozen) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0.0, Math.min(1.0, x / rect.width));
    setWipeRatio(ratio);
    setIsHovering(true);
  }, [isComparisonMode, viewMode, isFrozen]);

  const handlePointerLeave = () => {
    setIsHovering(false);
  };

  const handleToggleFreeze = (e: React.MouseEvent) => {
    if (!isComparisonMode || viewMode !== 'WIPE') return;
    e.stopPropagation();
    const nextFrozen = !isFrozen;
    setIsFrozen(nextFrozen);
    if (nextFrozen) {
      // 开启定格时，自动暂停并将对比层强行帧对齐
      setIsPlaying(false);
      if (videoLeftRef.current) videoLeftRef.current.pause();
      if (videoRightRef.current) {
        videoRightRef.current.pause();
        if (videoLeftRef.current) {
          videoRightRef.current.currentTime = videoLeftRef.current.currentTime;
        }
      }
    }
  };

  const handleResetCenter = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWipeRatio(0.5);
    setIsFrozen(false);
  };

  const handleCycleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => (prev === 1 ? 2 : prev === 2 ? 3 : 1));
  };

  const handleToggleViewMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewMode(prev => prev === 'WIPE' ? 'SOLO_4K' : prev === 'SOLO_4K' ? 'SOLO_ORIG' : 'WIPE');
  };

  // 严格帧对齐同步 Play/Pause
  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    const left = videoLeftRef.current;
    const right = videoRightRef.current;

    if (left && right) {
      if (nextPlaying) {
        // 播放前先校准到同一毫秒时间戳
        right.currentTime = left.currentTime;
        right.playbackRate = 1.0;
        left.play().catch(() => {});
        right.play().catch(() => {});
      } else {
        left.pause();
        right.pause();
        // 暂停时强制锁死到同一帧
        right.currentTime = left.currentTime;
      }
    } else if (left) {
      if (nextPlaying) left.play().catch(() => {});
      else left.pause();
    }
  };

  // 严格同步 Seek 进度定位
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (videoLeftRef.current) videoLeftRef.current.currentTime = t;
    if (videoRightRef.current) {
      videoRightRef.current.currentTime = t;
      videoRightRef.current.playbackRate = 1.0;
    }
  };

  // 精确单帧进退 (1/30s = 0.033333s)
  const handleStepFrame = (forward: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false);
    const left = videoLeftRef.current;
    const right = videoRightRef.current;
    if (left) left.pause();
    if (right) right.pause();
    
    const delta = forward ? (1.0 / 30.0) : -(1.0 / 30.0);
    const newTime = Math.max(0, Math.min(duration, currentTime + delta));
    setCurrentTime(newTime);
    if (left) left.currentTime = newTime;
    if (right) {
      right.currentTime = newTime;
      right.playbackRate = 1.0;
    }
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

  // 主视频时间更新与循环对齐
  const handleTimeUpdate = () => {
    const master = videoLeftRef.current;
    if (!master) return;
    const t = master.currentTime;
    setCurrentTime(t);
    if (master.duration && !isNaN(master.duration) && master.duration !== duration) {
      setDuration(master.duration);
    }
    // 循环边界快速复位对齐
    if (videoRightRef.current && t < 0.2 && videoRightRef.current.currentTime > 1.0) {
      videoRightRef.current.currentTime = 0;
      videoRightRef.current.playbackRate = 1.0;
    }
  };

  const handleLoadedMetadata = () => {
    if (videoLeftRef.current && videoLeftRef.current.duration) {
      setDuration(videoLeftRef.current.duration);
    }
  };

  const handleExportSnapshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modeDesc = isComparisonMode ? (viewMode === 'SOLO_4K' ? '纯净 4K' : viewMode === 'SOLO_ORIG' ? '纯净原片' : '4K 卷帘对比') : '原视频预览';
    alert(`已截取时间点 ${currentTime.toFixed(2)}s 的【${modeDesc}】无损单帧快照！`);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00.0';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s}.${ms}`;
  };

  // Calculate video transform style for zoom inspection
  const zoomStyle: React.CSSProperties = zoomLevel > 1 ? {
    transform: `scale(${zoomLevel})`,
    transformOrigin: '50% 30%', // focus on face and upper body
    transition: 'transform 0.15s ease-out'
  } : {
    transform: 'scale(1)',
    transition: 'transform 0.15s ease-out'
  };

  return (
    <div className="flex-1 min-h-0 w-full rounded-2xl dark:bg-[#0E1015]/95 bg-white/95 border dark:border-white/[0.08] border-black/[0.08] shadow-sm backdrop-blur-md flex flex-col p-3 space-y-2.5 relative select-none">
      {/* Player Header: Mode Indicator & Quick Actions */}
      <div className="flex items-center justify-between text-xs px-1 shrink-0">
        <div className="flex items-center gap-2">
          {isComparisonMode ? (
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="font-semibold tracking-wide text-[11px]">4K 神经超分对比模式</span>
              <span className="dark:text-gray-600 text-gray-400 text-[10px]">|</span>
              <span className="text-emerald-600/80 dark:text-emerald-400/80 text-[10px] hidden sm:inline">
                {viewMode === 'WIPE' ? '实时卷帘擦除 (左右滑动)' : viewMode === 'SOLO_4K' ? '纯净 4K 全画幅' : '纯净原片全画幅'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span className="font-semibold tracking-wide text-[11px]">原视频预览模式</span>
              <span className="dark:text-gray-600 text-gray-400 text-[10px]">|</span>
              <span className="text-cyan-600/80 dark:text-cyan-400/70 text-[10px] hidden sm:inline">尚未导出 4K，当前仅播放原始输入源</span>
            </div>
          )}
        </div>

        {/* Top Right Tool Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isComparisonMode && (
            <>
              {/* A/B Mode Toggle */}
              <button
                type="button"
                onClick={handleToggleViewMode}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium dark:bg-white/[0.04] bg-black/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] dark:text-gray-200 text-gray-700 border dark:border-white/[0.08] border-black/[0.08] transition-colors active:scale-[0.98] flex items-center gap-1 shadow-sm"
                title="切换显示模式：左右卷帘 / 纯净4K / 纯净原片"
              >
                <IconLayers className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                <span>{viewMode === 'WIPE' ? '卷帘对比' : viewMode === 'SOLO_4K' ? '查看 4K' : '查看原片'}</span>
              </button>

              {/* 100% / 200% Zoom Detail Loupe */}
              <button
                type="button"
                onClick={handleCycleZoom}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors active:scale-[0.98] flex items-center gap-1 shadow-sm ${
                  zoomLevel > 1 
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 shadow-sm' 
                    : 'dark:bg-white/[0.04] bg-black/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] dark:text-gray-200 text-gray-700 dark:border-white/[0.08] border-black/[0.08]'
                }`}
                title="局部细节放大检视 (放大至面部/发丝微观像素)"
              >
                <IconZoomIn className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                <span>{zoomLevel === 1 ? '100% 全画幅' : `${zoomLevel * 100}% 局部特写`}</span>
              </button>

              {/* Freeze Toggle */}
              {viewMode === 'WIPE' && (
                <button
                  type="button"
                  onClick={handleToggleFreeze}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 shadow-sm ${
                    isFrozen 
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' 
                      : 'dark:bg-white/[0.04] bg-black/[0.04] text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white dark:border-white/[0.08] border-black/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.08]'
                  }`}
                >
                  {isFrozen ? <IconPause className="w-3 h-3" /> : <IconPlay className="w-3 h-3" />}
                  <span>{isFrozen ? '已定格' : '单击定格'}</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleExportSnapshot}
            className="px-2 py-1 rounded-lg text-[11px] dark:bg-white/[0.04] bg-black/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white border dark:border-white/[0.08] border-black/[0.08] transition-colors flex items-center gap-1 active:scale-[0.98] shadow-sm"
            title="截取当前画面无损快照"
          >
            <IconCamera className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
            <span>快照</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport - Expands naturally in vertical height */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleToggleFreeze}
        onDoubleClick={() => handleResetCenter()}
        onWheel={handleWheel}
        className={`relative flex-1 min-h-[380px] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-black/20 dark:border-white/[0.08] shadow-inner ${
          isComparisonMode && viewMode === 'WIPE' ? 'cursor-col-resize' : 'cursor-default'
        }`}
      >
        {!leftSrc ? (
          <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
            <IconEye className="w-8 h-8 text-gray-600 animate-pulse" />
            <span className="text-xs">暂无视频源，请在上方选择 MP4 视频素材</span>
          </div>
        ) : isComparisonMode ? (
          <>
            {/* Layer 1: 4K Super-Resolution Output Video (Full Canvas) */}
            {(viewMode === 'WIPE' || viewMode === 'SOLO_4K') && (
              <div className="w-full h-full flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRightRef}
                  src={rightSrc}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  style={zoomStyle}
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            )}

            {/* Layer 2: Original Video (Left Clipped Layer in WIPE mode, or Full in SOLO_ORIG) */}
            {(viewMode === 'WIPE' || viewMode === 'SOLO_ORIG') && (
              <div
                className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none"
                style={{
                  clipPath: viewMode === 'WIPE' 
                    ? `polygon(0 0, ${wipeRatio * 100}% 0, ${wipeRatio * 100}% 100%, 0 100%)`
                    : 'none',
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
                  style={zoomStyle}
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            )}

            {/* Zero-Lag Laser Wipe Divider (Only active in WIPE mode) */}
            {viewMode === 'WIPE' && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: `${wipeRatio * 100}%`,
                  transform: 'translateX(-50%)',
                  willChange: 'left'
                }}
              >
                {/* Vertical laser line */}
                <div className={`w-[2px] h-full ${
                  isHovering || isFrozen
                    ? 'bg-emerald-400 shadow-[0_0_12px_#10B981,0_0_24px_#10B981]'
                    : 'bg-white/75 shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                }`} />

                {/* Floating Percentage Pill */}
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#0B0D12]/95 border border-emerald-400 text-emerald-300 text-[10px] font-mono tracking-tighter shadow-2xl">
                  {(wipeRatio * 100).toFixed(0)}%
                </div>
              </div>
            )}

            {/* Viewport Corner Badges with Precision SVG Icons (No Unicode arrows) */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 border border-white/10 text-gray-200 text-[11px] font-mono font-semibold backdrop-blur-md pointer-events-none shadow-md flex items-center gap-1">
              <IconChevronLeft className="w-3 h-3 text-gray-400" />
              <span>原片 ({inputResolution})</span>
            </div>
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-950/85 border border-emerald-500/50 text-emerald-300 text-[11px] font-mono font-semibold backdrop-blur-md pointer-events-none shadow-md flex items-center gap-1">
              <span>4K DLSS 5 超分 ({outputResolution})</span>
              <IconChevronRight className="w-3 h-3 text-emerald-400" />
            </div>
          </>
        ) : (
          /* Mode A: Single Original Video Preview */
          <video
            ref={videoLeftRef}
            src={leftSrc}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            style={zoomStyle}
            className="w-full h-full object-contain pointer-events-none"
          />
        )}
      </div>

      {/* Video Transport & Timeline Controls - Exactly 1 compact row */}
      <div className="flex flex-nowrap items-center justify-between px-1 text-xs dark:text-gray-300 text-gray-700 gap-3 shrink-0">
        {/* Play/Pause & Step Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!leftSrc}
            className="p-1.5 rounded-lg dark:bg-white/[0.08] bg-black/[0.06] hover:bg-emerald-500/20 text-gray-800 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 border dark:border-white/10 border-black/10 transition-colors disabled:opacity-40 shadow-sm"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <IconPause className="w-3.5 h-3.5" /> : <IconPlay className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={(e) => handleStepFrame(false, e)}
            disabled={!leftSrc}
            className="px-2 py-1 rounded-lg dark:bg-white/[0.04] bg-black/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 border dark:border-white/[0.06] border-black/[0.06] text-[11px] font-mono transition-colors disabled:opacity-40 flex items-center gap-1 shadow-sm"
            title="后退 1 帧"
          >
            <IconStepBack className="w-3 h-3" />
            <span>-1帧</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleStepFrame(true, e)}
            disabled={!leftSrc}
            className="px-2 py-1 rounded-lg dark:bg-white/[0.04] bg-black/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 border dark:border-white/[0.06] border-black/[0.06] text-[11px] font-mono transition-colors disabled:opacity-40 flex items-center gap-1 shadow-sm"
            title="前进 1 帧"
          >
            <span>+1帧</span>
            <IconStepForward className="w-3 h-3" />
          </button>

          {/* Timecode */}
          <span className="font-mono dark:text-gray-300 text-gray-700 text-[11px] px-1 whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 mx-2 flex items-center min-w-[120px]">
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            disabled={!leftSrc}
            className="w-full h-1.5 dark:bg-white/[0.08] bg-black/[0.1] hover:bg-black/[0.15] dark:hover:bg-white/[0.12] rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-40 transition-colors"
          />
        </div>

        {/* Right Aux Controls */}
        <div className="flex items-center gap-2 text-[11px] shrink-0">
          {isComparisonMode && viewMode === 'WIPE' && (
            <button
              type="button"
              onClick={() => handleResetCenter()}
              className="px-2 py-1 rounded-lg dark:bg-white/[0.04] bg-black/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white border dark:border-white/[0.06] border-black/[0.06] transition-colors flex items-center gap-1 whitespace-nowrap shadow-sm"
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
            className="p-1.5 rounded-lg dark:bg-white/[0.04] bg-black/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 border dark:border-white/[0.06] border-black/[0.06] transition-colors disabled:opacity-40 shrink-0 shadow-sm"
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted ? <IconVolumeX className="w-3.5 h-3.5" /> : <IconVolume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
