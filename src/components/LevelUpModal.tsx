import React, { useState, useEffect } from 'react';
import { Sparkles, Flame } from 'lucide-react';
import { CardOption } from '../types/game';
import { generateCardOptions, applyCardSelection } from '../managers/StatManager';
import { state } from '../core/GameState';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReTriggerLevelUp?: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ isOpen, onClose, onReTriggerLevelUp }) => {
  const [cards, setCards] = useState<CardOption[]>([]);
  const [rerollCount, setRerollCount] = useState<number>(2); // 레벨업당 2회 재추첨 기회

  useEffect(() => {
    if (isOpen) {
      setCards(generateCardOptions());
      setRerollCount(2); // 모달 오픈 시 2회 재추첨 리셋
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectCard = (card: CardOption) => {
    onClose();
    applyCardSelection(card, onReTriggerLevelUp);
  };

  const handleReroll = () => {
    if (rerollCount <= 0) return;
    setRerollCount((prev) => prev - 1);
    setCards(generateCardOptions());
  };

  const getTierStyle = (tier: CardOption['tier']) => {
    switch (tier) {
      case 'Legendary':
        return 'border-amber-400/90 bg-gradient-to-b from-amber-950/80 via-yellow-950/70 to-slate-950/90 shadow-amber-500/25 ring-1 ring-amber-400/50';
      case 'Epic':
        return 'border-purple-400/80 bg-gradient-to-b from-purple-950/70 to-slate-950/90 shadow-purple-500/20';
      case 'Rare':
        return 'border-sky-400/80 bg-gradient-to-b from-sky-950/70 to-slate-950/90 shadow-sky-500/20';
      default:
        return 'border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/90';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-slate-950/85 backdrop-blur-lg">
      <div className="relative w-full max-w-4xl glass-panel-gold rounded-2xl p-2.5 sm:p-4 flex flex-col items-center text-center shadow-2xl max-h-[98dvh] overflow-hidden my-auto border border-amber-500/30">
        
        {/* Title Header */}
        <h2 className="text-[11px] sm:text-xs font-black text-amber-300 mb-1.5">
          스탯 강화 선택 (Lv.{state.level})
        </h2>

        {/* 3 Horizontal/Grid Cards (Always 3 columns in Landscape!) */}
        <div className="w-full grid grid-cols-3 gap-1.5 sm:gap-3 mb-2">
          {cards.map((card) => {
            return (
              <button
                key={card.id}
                onClick={() => handleSelectCard(card)}
                className={`rounded-xl p-2 sm:p-3 border flex flex-col justify-between text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md ${getTierStyle(
                  card.tier
                )}`}
              >
                <div>
                  {/* Icon & Parent Stat Title (Pure Color Rarity Indicator!) */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs sm:text-sm font-black text-slate-100 truncate leading-tight">
                      {card.parentName} <span className="text-amber-400">+{card.statPtAdd}pt</span>
                    </span>
                  </div>

                  {card.isJackpot && (
                    <div className="inline-flex items-center gap-1 text-[9px] font-black text-orange-400 bg-orange-950/60 border border-orange-500/50 px-1 py-0.5 rounded mb-1">
                      <span>더블 잭팟</span>
                    </div>
                  )}

                  {/* 2 Sub-Stats List */}
                  <div className="mt-1 space-y-0.5 bg-slate-950/60 rounded-lg p-1.5 border border-slate-800/80">
                    {card.subStats.map((sub, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[9px] sm:text-[10px] gap-1">
                        <span className="text-slate-300 font-medium whitespace-nowrap">{sub.label}</span>
                        <span className="font-bold text-amber-300 shrink-0">{sub.valText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Reroll Button (카드 재추첨) */}
        <div className="w-full flex items-center justify-center">
          <button
            onClick={handleReroll}
            disabled={rerollCount <= 0}
            className={`px-3 py-1 rounded-lg font-bold text-[10px] sm:text-xs flex items-center gap-1.5 border transition-all duration-200 shadow-sm ${
              rerollCount > 0
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 hover:border-amber-400 hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
            }`}
          >
            <span>카드 재추첨 (남은 횟수: {rerollCount}회)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
