import React from 'react';
import { AppConfig } from '../types';
import { IconFolder, IconExternalLink } from './Icons';

interface Props {
  config: AppConfig;
  onChangeOutputDir: (dir: string) => void;
  onCallNativeFolderPicker?: () => void;
  onOpenExplorer?: () => void;
}

export const PathConfigSection: React.FC<Props> = ({
  config,
  onCallNativeFolderPicker,
  onOpenExplorer
}) => {
  const isUsingFallback = !config.outputDir;
  const currentPath = config.outputDir || config.fallbackDir;

  return (
    <div className="p-4 rounded-2xl bg-[#13151C]/90 border border-white/[0.08] shadow-2xl backdrop-blur-md flex flex-col space-y-2.5 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <IconFolder className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-gray-200 uppercase tracking-wider text-xs">输出路径与三级 Fallback 容灾指定</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onCallNativeFolderPicker}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer text-xs"
          >
            <IconFolder className="w-3.5 h-3.5" />
            <span>浏览文件夹...</span>
          </button>
          <button
            type="button"
            onClick={onOpenExplorer}
            className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer text-xs"
          >
            <IconExternalLink className="w-3.5 h-3.5" />
            <span>打开目录</span>
          </button>
        </div>
      </div>

      {/* Styled Breadcrumb */}
      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-gray-300 flex items-center justify-between">
        <div className="flex items-center space-x-2 truncate">
          <span className="text-cyan-400 font-bold tracking-wider">TARGET:</span>
          <span className="truncate text-gray-200">{currentPath}</span>
        </div>
        {isUsingFallback ? (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] whitespace-nowrap">
            默认保底: 源目录\output_4k\
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] whitespace-nowrap">
            用户指定路径
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
        <span>文件名模板: <span className="text-gray-200 font-mono">{'{filename}'}_4K_DLSS5.mp4</span> (同名自动递增序列号保底)</span>
        <span>容器标准: <span className="text-emerald-400 font-medium">faststart 头部已就绪</span></span>
      </div>
    </div>
  );
};
