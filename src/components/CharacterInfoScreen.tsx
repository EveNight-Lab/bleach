import React from 'react';
import { Swords, Shield, Zap, Sparkles, Flame, RefreshCw, Play } from 'lucide-react';
import { state } from '../core/GameState';
import { rollRandomCharacter } from '../managers/CharacterRoll';

interface CharacterInfoScreenProps {
  onStartBattle: () => void;
  onReRoll: () => void;
}

export const CharacterInfoScreen: React.FC<CharacterInfoScreenProps> = ({ onStartBattle, onReRoll }) => {
  const [, setRefreshKey] = React.useState(0);

  const attack = state.assignedAttack;
  const s = state.stats;

  const handleReRoll = () => {
    rollRandomCharacter();
    setRefreshKey((prev) => prev + 1);
    onReRoll();
  };

  const statItems = [
    { label: '참 (斬)', val: s.cham, icon: '⚔️', color: 'from-amber-500 to-red-500', desc: '기본 공격력 & 공속' },
    { label: '권 (拳)', val: s.gwon, icon: '👊', color: 'from-emerald-500 to-teal-500', desc: '최대 체력 & 피해 감쇄' },
    { label: '주 (走)', val: s.ju, icon: '⚡', color: 'from-sky-500 to-blue-500', desc: '이동 속도 & 순보 쿨감' },
    { label: '귀 (鬼)', val: s.gwi, icon: '🔮', color: 'from-purple-500 to-indigo-500', desc: '자석 흡입 & 영압 둔화' },
  ];

  return (
    <div className="relative w-dvw h-dvh overflow-hidden bg-slate-950 flex items-center justify-center p-2.5 sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-xl glass-panel-gold rounded-2xl p-3 sm:p-5 flex flex-col items-center text-center shadow-2xl max-h-[96dvh] my-auto">
        <h2 className="text-lg sm:text-2xl font-black text-amber-100 mb-2">
          사신 스탯 배정 결과
        </h2>

        {/* 2-Column Responsive Split in Landscape */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 text-left">
          {/* Left: Attack Skill Box */}
          <div className="sm:col-span-5 bg-slate-900/90 rounded-xl p-2.5 border border-amber-500/30 flex flex-col justify-between shadow-inner">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <h3 className="text-xs sm:text-sm font-black text-amber-300">{attack.name}</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {attack.shape}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">{attack.desc}</p>
            </div>
          </div>

          {/* Right: 4 Stats Grid */}
          <div className="sm:col-span-7 grid grid-cols-2 gap-1.5">
            {statItems.map((st, idx) => (
              <div key={idx} className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold text-slate-200">
                    {st.label}
                  </span>
                  <span className="text-[11px] font-black text-amber-400">Lv.{st.val}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden mb-0.5">
                  <div
                    className={`h-full bg-gradient-to-r ${st.color}`}
                    style={{ width: `${Math.min(100, (st.val / 5) * 100)}%` }}
                  />
                </div>
                <span className="text-[8px] text-slate-400 leading-none">{st.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center gap-2">
          <button
            onClick={handleReRoll}
            className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <span>능력치 재추첨</span>
          </button>

          <button
            onClick={onStartBattle}
            className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center transition-all transform active:scale-95 hover:scale-[1.01] cursor-pointer"
          >
            <span>전투 시작 (Battle Start)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
