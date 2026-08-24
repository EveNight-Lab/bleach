import React from 'react';
import { RefreshCw, Skull, Clock, Trophy, Flame } from 'lucide-react';
import { state } from '../core/GameState';
import { rollRandomCharacter } from '../managers/CharacterRoll';

interface GameOverModalProps {
  isOpen: boolean;
  onRetry: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, onRetry }) => {
  if (!isOpen) return null;

  const mins = Math.floor(state.gameTime / 60).toString().padStart(2, '0');
  const secs = Math.floor(state.gameTime % 60).toString().padStart(2, '0');
  const s = state.stats;

  const handleRetryClick = () => {
    rollRandomCharacter();
    onRetry();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-slate-950/90 backdrop-blur-xl">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl p-2.5 sm:p-4 flex flex-col items-center text-center shadow-2xl border border-rose-500/30 max-h-[98dvh] overflow-hidden my-auto">
        {/* Title Header */}
        <h2 className="text-xs sm:text-base font-black text-rose-400 mb-2">
          사신 전사 (Game Over)
        </h2>

        {/* Stats Result Box (4 Columns Inline) */}
        <div className="w-full bg-slate-900/90 rounded-xl p-2 border border-slate-800 mb-2.5 grid grid-cols-4 gap-1 text-center shadow-inner">
          <div className="flex flex-col items-center p-1 bg-slate-950/50 rounded-lg">
            <span className="text-[9px] text-slate-400">생존 시간</span>
            <span className="text-xs font-black text-slate-200 font-mono">{mins}:{secs}</span>
          </div>

          <div className="flex flex-col items-center p-1 bg-slate-950/50 rounded-lg">
            <span className="text-[9px] text-slate-400">호로 토벌</span>
            <span className="text-xs font-black text-slate-200">{state.kills}마리</span>
          </div>

          <div className="flex flex-col items-center p-1 bg-slate-950/50 rounded-lg">
            <span className="text-[9px] text-slate-400">달성 레벨</span>
            <span className="text-xs font-black text-amber-400">Lv.{state.level}</span>
          </div>

          <div className="flex flex-col items-center p-1 bg-slate-950/50 rounded-lg">
            <span className="text-[9px] text-slate-400">최종 스탯</span>
            <span className="text-[10px] font-bold text-slate-300">
              참{s.cham}권{s.gwon}주{s.ju}귀{s.gwi}
            </span>
          </div>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRetryClick}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center transition-all transform active:scale-95 hover:scale-[1.01] cursor-pointer"
        >
          <span>새 사신 추첨 및 재도전</span>
        </button>
      </div>
    </div>
  );
};
