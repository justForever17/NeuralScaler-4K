import React from 'react';
import { VideoMetadata } from '../types';
import { IconVideo, IconFolder, IconShieldCheck, IconAlertTriangle } from './Icons';

interface Props {
  video: VideoMetadata | null;
  onVideoSelect: (video: VideoMetadata) => void;
  onConfirm480pRisk: () => void;
  onCallNativePicker?: () => void;
}

export const VideoInputSection: React.FC<Props> = ({
  video,
  onConfirm480pRisk,
  onCallNativePicker
}) => {
  return (
    <div className="p-5 rounded-2xl bg-[#13151C]/90 border border-white/[0.08] shadow-2xl backdrop-blur-md flex flex-col space-y-3.5 relative overflow-hidden group">
      {/* Subtle top glow */}
      <div className="absolute -top-12 left-1/4 w-1/2 h-12 bg-cyan-500/10 blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <IconVideo className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-semibold text-gray-200 tracking-wider uppercase">视频输入与智能画质审计</h2>
        </div>
        <button
          type="button"
          onClick={onCallNativePicker}
          className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center space-x-1.5 cursor-pointer active:scale-95"
        >
          <IconFolder className="w-3.5 h-3.5" />
          <span>调用系统文件选择器...</span>
        </button>
      </div>

      {/* Dropzone Card */}
      <div
        onClick={onCallNativePicker}
        className="border border-dashed border-white/15 hover:border-cyan-400/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-black/20 hover:bg-cyan-500/[0.03] group/drop"
      >
        {video ? (
          <div className="w-full flex items-center justify-between">
            <div className="space-y-1 text-left">
              <div className="font-semibold text-sm text-gray-100 flex items-center space-x-2">
                <span className="truncate max-w-xs">{video.fileName}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300 text-[10px] font-mono">
                  {(video.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
              <div className="text-xs text-gray-400 flex items-center space-x-3">
                <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                  {video.width} &times; {video.height}
                </span>
                <span>时长: <b className="text-gray-200">{video.durationSeconds.toFixed(1)}s</b></span>
                <span>编码: <b className="text-gray-200">{video.codec}</b></span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono truncate max-w-sm pt-0.5">
                {video.filePath}
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
            >
              更换
            </button>
          </div>
        ) : (
          <div className="text-center py-2 space-y-1.5">
            <div className="w-10 h-10 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-1 group-hover/drop:scale-110 transition-transform">
              <IconFolder className="w-5 h-5" />
            </div>
            <div className="text-xs text-gray-200 font-medium">点击浏览或拖拽本地 MP4 视频至此处</div>
            <div className="text-[11px] text-gray-500">
              专注 <span className="text-cyan-400">720P ~ 1080P</span> 黄金超分区间 | 最低宽容支持 480P
            </div>
          </div>
        )}
      </div>

      {/* Validation Status Banner */}
      {video && video.status === 'RECOMMENDED' && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2.5">
          <IconShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="leading-tight">
            <span className="font-semibold text-emerald-400">黄金推荐分辨率 (1080P/720P)</span>
            <span className="text-gray-400 ml-1.5 text-[11px]">— {video.statusMessage}</span>
          </div>
        </div>
      )}

      {video && video.status === 'WARNING_480P' && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
          <div className="flex items-center space-x-2 font-semibold text-amber-400">
            <IconAlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>极限低分辨率风险预警 (480P)</span>
          </div>
          <p className="text-gray-300 leading-relaxed text-[11px]">
            {video.statusMessage}
          </p>
          <div className="flex items-center space-x-2 pt-1">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={video.isConfirmed480pRisk}
                onChange={onConfirm480pRisk}
                className="w-4 h-4 rounded border-amber-500/50 bg-black/60 text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-amber-300 font-medium">
                我已知晓微观人脸/轮廓形变风险，确认继续超分
              </span>
            </label>
          </div>
        </div>
      )}

      {video && video.status === 'REJECTED' && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5">
          <IconAlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <div>
            <span className="font-semibold text-rose-400">非法输入拦截：</span>
            <span className="text-gray-300 ml-1 text-[11px]">{video.statusMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
