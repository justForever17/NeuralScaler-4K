import React from 'react';
import { 
  IconVideo, 
  IconFolder, 
  IconExternalLink, 
  IconSliders, 
  IconChevronDown 
} from './Icons';
import { VideoMetadata, AppConfig, QualityProfile } from '../types';

interface ToolbarProps {
  video: VideoMetadata | null;
  config: AppConfig;
  targetResolution: '4K' | '2X';
  onChangeTargetResolution: (res: '4K' | '2X') => void;
  onChangeProfile: (profile: QualityProfile) => void;
  onCallNativePicker: () => void;
  onCallNativeFolderPicker: () => void;
  onOpenExplorer: () => void;
  isProcessing: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  video,
  config,
  targetResolution,
  onChangeTargetResolution,
  onChangeProfile,
  onCallNativePicker,
  onCallNativeFolderPicker,
  onOpenExplorer,
  isProcessing,
}) => {
  const currentOutputDir = config.outputDir || config.fallbackDir;
  
  // Format folder display name
  const folderDisplay = currentOutputDir 
    ? (currentOutputDir.length > 32 
        ? '...' + currentOutputDir.slice(-30) 
        : currentOutputDir)
    : '选择导出目录...';

  return (
    <header className="bg-[#12141A]/90 backdrop-blur-md border border-white/[0.08] rounded-xl px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-4">
      {/* Left: Video Source Selection & Info */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onCallNativePicker}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-medium text-xs tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0"
        >
          <IconVideo className="w-3.5 h-3.5" />
          <span>{video ? '更换视频' : '选择源视频'}</span>
        </button>

        {video ? (
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-gray-200">
              <span className="font-mono text-gray-400 max-w-[160px] truncate" title={video.filePath}>
                {video.fileName}
              </span>
              <span className="text-gray-600">|</span>
              <span className="font-mono font-medium text-gray-300">
                {video.width}×{video.height}
              </span>
              <span className="text-gray-500 font-mono">
                {video.fps}fps
              </span>
              <span className="text-gray-500 font-mono">
                {video.durationSeconds.toFixed(1)}s
              </span>
            </div>

            {/* Status Pill */}
            {video.status === 'RECOMMENDED' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                画质极佳
              </span>
            )}
            {(video.status === 'WARNING_LOW_RES' || video.status === 'WARNING_480P') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20" title={video.statusMessage}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                低清时序增强
              </span>
            )}
            {video.status === 'ALREADY_4K' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                已达 4K
              </span>
            )}
            {video.status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20" title={video.statusMessage}>
                分辨率过低
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-500">未载入输入视频，请点击选择</span>
        )}
      </div>

      {/* Middle & Right Controls */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Dropdown: Algorithm Profile */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <IconSliders className="w-3 h-3 text-gray-500" />
            算法:
          </span>
          <div className="relative inline-block">
            <select
              value={config.qualityProfile}
              disabled={isProcessing}
              onChange={(e) => onChangeProfile(e.target.value as QualityProfile)}
              className="appearance-none text-xs bg-[#1A1D26] hover:bg-[#222531] border border-white/[0.1] hover:border-white/20 text-gray-200 pl-2.5 pr-7 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <option value="FAITHFUL">忠实保真 (推荐·极速)</option>
              <option value="NATURAL">自然质感 (细节平衡)</option>
              <option value="CINEMATIC">深层重构 (胶片影院)</option>
            </select>
            <IconChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Dropdown: Target Resolution */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">规格:</span>
          <div className="relative inline-block">
            <select
              value={targetResolution}
              disabled={isProcessing}
              onChange={(e) => onChangeTargetResolution(e.target.value as '4K' | '2X')}
              className="appearance-none text-xs bg-[#1A1D26] hover:bg-[#222531] border border-white/[0.1] hover:border-white/20 text-gray-200 pl-2.5 pr-7 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <option value="4K">4K UHD (3840×2160)</option>
              <option value="2X">等比双倍 (2× 原始比例)</option>
            </select>
            <IconChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-0.5 hidden sm:block"></div>

        {/* Export Folder Pill */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-lg p-0.5 text-xs">
          <div 
            className="flex items-center gap-1.5 px-2 py-1 text-gray-400 max-w-[170px] truncate"
            title={currentOutputDir}
          >
            <IconFolder className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span className="truncate font-mono text-[11px] text-gray-300">
              {folderDisplay}
            </span>
          </div>

          <button
            onClick={onCallNativeFolderPicker}
            disabled={isProcessing}
            className="px-2 py-1 text-[11px] text-gray-300 hover:text-white hover:bg-white/[0.08] rounded transition-colors disabled:opacity-50"
            title="更改导出存储目录"
          >
            更改
          </button>

          <button
            onClick={onOpenExplorer}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/[0.08] rounded transition-colors"
            title="在文件资源管理器中打开"
          >
            <IconExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
