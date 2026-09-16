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
  
  // Format folder display name safely
  const folderDisplay = currentOutputDir 
    ? (currentOutputDir.length > 24 
        ? '...' + currentOutputDir.slice(-20) 
        : currentOutputDir)
    : '选择导出目录...';

  return (
    <header className="bg-[#12141A]/95 backdrop-blur-md border border-white/[0.08] rounded-xl px-3.5 h-12 shadow-lg flex flex-nowrap items-center justify-between gap-3 shrink-0 overflow-hidden">
      {/* Left: Video Source Selection & Info */}
      <div className="flex items-center gap-2.5 min-w-0 shrink">
        <button
          onClick={onCallNativePicker}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-medium text-xs tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0"
        >
          <IconVideo className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">{video ? '更换视频' : '选择源视频'}</span>
        </button>

        {video ? (
          <div className="flex items-center gap-2 min-w-0 text-xs shrink">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-gray-200 min-w-0">
              <span className="font-mono text-gray-300 max-w-[140px] truncate" title={video.filePath}>
                {video.fileName}
              </span>
              <span className="text-gray-600 shrink-0">|</span>
              <span className="font-mono font-medium text-gray-300 shrink-0 whitespace-nowrap">
                {video.width}×{video.height}
              </span>
              <span className="text-gray-500 font-mono shrink-0 whitespace-nowrap hidden sm:inline">
                {video.fps}fps
              </span>
              <span className="text-gray-500 font-mono shrink-0 whitespace-nowrap hidden sm:inline">
                {video.durationSeconds.toFixed(1)}s
              </span>
            </div>

            {/* Status Pill */}
            {video.status === 'RECOMMENDED' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                画质极佳
              </span>
            )}
            {(video.status === 'WARNING_LOW_RES' || video.status === 'WARNING_480P') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0 whitespace-nowrap" title={video.statusMessage}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                低清时序增强
              </span>
            )}
            {video.status === 'ALREADY_4K' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 shrink-0 whitespace-nowrap">
                已达 4K
              </span>
            )}
            {video.status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 shrink-0 whitespace-nowrap" title={video.statusMessage}>
                分辨率过低
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">未载入输入视频，请点击选择</span>
        )}
      </div>

      {/* Right Controls: Exactly in single row, no wrapping */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Dropdown: Algorithm Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
            <IconSliders className="w-3 h-3 text-gray-500 shrink-0" />
            算法:
          </span>
          <div className="relative inline-block shrink-0">
            <select
              value={config.qualityProfile}
              disabled={isProcessing}
              onChange={(e) => onChangeProfile(e.target.value as QualityProfile)}
              className="appearance-none text-xs bg-[#1A1D26] hover:bg-[#222531] border border-white/[0.1] hover:border-white/20 text-gray-200 pl-2.5 pr-6 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <option value="FAITHFUL">忠实保真 (推荐·极速)</option>
              <option value="NATURAL">自然质感 (细节平衡)</option>
              <option value="CINEMATIC">深层重构 (胶片影院)</option>
            </select>
            <IconChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Dropdown: Target Resolution */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-gray-400 whitespace-nowrap">规格:</span>
          <div className="relative inline-block shrink-0">
            <select
              value={targetResolution}
              disabled={isProcessing}
              onChange={(e) => onChangeTargetResolution(e.target.value as '4K' | '2X')}
              className="appearance-none text-xs bg-[#1A1D26] hover:bg-[#222531] border border-white/[0.1] hover:border-white/20 text-gray-200 pl-2.5 pr-6 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <option value="4K">4K UHD (3840×2160)</option>
              <option value="2X">等比双倍 (2× 原始比例)</option>
            </select>
            <IconChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="h-4 w-[1px] bg-white/10 shrink-0"></div>

        {/* Export Folder Pill */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-lg p-0.5 text-xs shrink-0">
          <div 
            className="flex items-center gap-1 px-2 py-0.5 text-gray-400 max-w-[130px] truncate"
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
            className="px-2 py-0.5 text-[11px] text-gray-300 hover:text-white hover:bg-white/[0.08] rounded transition-colors disabled:opacity-50 whitespace-nowrap"
            title="更改导出存储目录"
          >
            更改
          </button>

          <button
            onClick={onOpenExplorer}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/[0.08] rounded transition-colors shrink-0"
            title="在文件资源管理器中打开"
          >
            <IconExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
