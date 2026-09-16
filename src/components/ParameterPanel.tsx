import React from 'react';
import { QualityProfile, AppConfig } from '../types';
import { IconSparkles, IconCpu } from './Icons';

interface Props {
  config: AppConfig;
  onChangeConfig: (newConfig: Partial<AppConfig>) => void;
}

export const ParameterPanel: React.FC<Props> = ({ config, onChangeConfig }) => {
  const profiles: { id: QualityProfile; name: string; tag: string; desc: string }[] = [
    {
      id: 'FAITHFUL',
      name: '忠实保真',
      tag: '黄金推荐',
      desc: '严格锁死原片骨相，仅补充漫反射次表面散射与微观毛孔，严禁面部形变。'
    },
    {
      id: 'NATURAL',
      name: '自然微调',
      tag: '去噪平滑',
      desc: '适度平滑网络压缩噪斑，增强眼神光与发丝边缘微对比。'
    },
    {
      id: 'CINEMATIC',
      name: '影院细节',
      tag: '胶片质感',
      desc: '强化局部微反差与阴影纵深，保留光学胶片微颗粒纵深感。'
    }
  ];

  return (
    <div className="p-5 rounded-2xl bg-[#13151C]/90 border border-white/[0.08] shadow-2xl backdrop-blur-md flex flex-col space-y-3.5 relative overflow-hidden">
      <div className="flex items-center space-x-2">
        <IconSparkles className="w-4 h-4 text-cyan-400" />
        <h2 className="text-xs font-semibold text-gray-200 tracking-wider uppercase">超分算法与画质风格配置</h2>
      </div>

      {/* Profiles 3 Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {profiles.map(p => {
          const isSelected = config.qualityProfile === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChangeConfig({ qualityProfile: p.id })}
              className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-400/60 shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-cyan-400/30'
                  : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-gray-100">{p.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-gray-400'
                  }`}>
                    {p.tag}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hardware Pipeline Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col space-y-0.5">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">输出目标规格</span>
          <span className="font-semibold text-xs text-gray-200">4K UHD (3840&times;2160)</span>
        </div>
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col space-y-0.5">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">色彩空间标定</span>
          <span className="font-semibold text-xs text-emerald-400">BT.709 VUI (防发白)</span>
        </div>
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col space-y-0.5">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">硬件光流引导</span>
          <span className="font-semibold text-xs text-cyan-400">OFA 专用电路 (0.8ms)</span>
        </div>
      </div>
    </div>
  );
};
