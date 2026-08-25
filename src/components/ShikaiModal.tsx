import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, RefreshCw, Zap } from 'lucide-react';
import { ShikaiPipeline } from '../types/game';
import { generateShikaiPipeline, SHIKAI_ARCHETYPES } from '../managers/ShikaiManager';
import { restoreWindowFocus } from '../core/InputManager';
import { state } from '../core/GameState';
import { Synth } from '../core/AudioManager';

interface ShikaiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShikaiModal: React.FC<ShikaiModalProps> = ({ isOpen, onClose }) => {
  const [pipeline, setPipeline] = useState<ShikaiPipeline | null>(null);
  const [rerollCount, setRerollCount] = useState<number>(3); // 시해 각성 이벤트 당 최대 3회 재굴림
  const [reelStep, setReelStep] = useState<number>(0); // 0: 시작전, 1: 컨셉 락인, 2: Block1 락인, 3: Block2 락인 (완료)

  const spinReels = () => {
    const nextPipeline = generateShikaiPipeline();
    setPipeline(nextPipeline);
    setReelStep(0);

    // 0.3초 간격 3-릴 연쇄 락인 연출
    setTimeout(() => {
      setReelStep(1);
      Synth.playLevelUpSound();
    }, 350);

    setTimeout(() => {
      setReelStep(2);
      Synth.playLevelUpSound();
    }, 700);

    setTimeout(() => {
      setReelStep(3);
      Synth.playLevelUpSound();
    }, 1050);
  };

  useEffect(() => {
    if (isOpen) {
      setRerollCount(3);
      spinReels();
    }
  }, [isOpen]);

  if (!isOpen || !pipeline) return null;

  const handleReroll = () => {
    if (rerollCount <= 0 || reelStep < 3) return;
    setRerollCount((prev) => prev - 1);
    spinReels();
  };

  const handleConfirm = () => {
    if (reelStep < 3) return;
    restoreWindowFocus();
    state.shikai = pipeline;
    state.shikaiUnlocked = true;
    state.isPaused = false;
    Synth.playLevelUpSound();
    onClose();
  };

  const archDef = SHIKAI_ARCHETYPES[pipeline.archetype];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-xl">
      <div className="relative w-full max-w-2xl glass-panel-gold rounded-2xl p-4 sm:p-6 flex flex-col items-center text-center shadow-2xl border border-amber-500/50 my-auto overflow-hidden animate-pulse-slow">
        
        {/* 영압 시해 헤더 */}
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
          <h2 className="text-sm sm:text-base font-black text-amber-300 tracking-wider">
            참백도의 진정한 이름을 부르고 시해(始解)를 해방하라!
          </h2>
          <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
        </div>

        {/* 1. 컨셉 종류 릴 (Concept Slot Reel) */}
        <div className="w-full mb-3">
          <div className="text-[10px] sm:text-xs text-slate-400 mb-1 font-mono">
            [1단계] 참백도 시해 해방 스탠스 컨셉
          </div>
          <div className={`p-2.5 rounded-xl border text-center transition-all duration-300 shadow-lg ${
            reelStep >= 1
              ? `${archDef.color} scale-100 opacity-100 ring-2 ring-amber-400/40`
              : 'bg-slate-900/60 border-slate-800 text-slate-500 scale-95 opacity-50'
          }`}>
            <div className="text-xs sm:text-sm font-black tracking-wide">
              {reelStep >= 1 ? pipeline.archetypeName : '🎰 릴 회전 중...'}
            </div>
            {reelStep >= 1 && (
              <div className="text-[10px] sm:text-xs text-slate-300 mt-0.5">
                {archDef.desc}
              </div>
            )}
          </div>
        </div>

        {/* 2. 물리 형태 릴 (Block 1 Slot Reel: 물리 형태 & 소환) */}
        <div className="w-full mb-3">
          <div className="text-[10px] sm:text-xs text-slate-400 mb-1 font-mono">
            [2단계] 물리적 형태 & 소환 메커니즘
          </div>
          <div className={`p-3 rounded-xl border text-left transition-all duration-300 shadow-md ${
            reelStep >= 2
              ? pipeline.block1.isMacro
                ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 ring-1 ring-amber-400/50'
                : 'bg-slate-900/90 border-sky-500/40 text-slate-100'
              : 'bg-slate-900/60 border-slate-800 text-slate-500'
          }`}>
            <div className="text-xs sm:text-sm font-bold leading-relaxed font-mono">
              {reelStep >= 2 ? pipeline.block1.text : '🎰 릴 회전 중...'}
            </div>
          </div>
        </div>

        {/* 3. 인과율 효과 릴 (Block 2 Slot Reel: 인과율 13대 레지스트리 효과) */}
        <div className="w-full mb-4">
          <div className="text-[10px] sm:text-xs text-slate-400 mb-1 font-mono">
            [3단계] 적중 충돌 인과율 13대 참백도 고유 효과
          </div>
          <div className={`p-3 rounded-xl border text-left transition-all duration-300 shadow-md ${
            reelStep >= 3
              ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 ring-1 ring-cyan-400/50'
              : 'bg-slate-900/60 border-slate-800 text-slate-500'
          }`}>
            <div className="text-xs sm:text-sm font-bold leading-relaxed font-mono">
              {reelStep >= 3 ? pipeline.block2.text : '🎰 릴 회전 중...'}
            </div>
          </div>
        </div>

        {/* 하단 버튼 구역 (재생성 최대 3회 & 해방 확정) */}
        <div className="w-full flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
          <button
            onClick={handleReroll}
            disabled={rerollCount <= 0 || reelStep < 3}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all duration-200 shadow-md ${
              rerollCount > 0 && reelStep >= 3
                ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400 hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reelStep < 3 ? 'animate-spin' : ''}`} />
            <span>시해 전체 재조합 (남은 기회: {rerollCount}회)</span>
          </button>

          <button
            onClick={handleConfirm}
            disabled={reelStep < 3}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 border transition-all duration-200 shadow-lg ${
              reelStep >= 3
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 border-amber-300 hover:scale-105 active:scale-95 cursor-pointer shadow-amber-500/30'
                : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>참백도 진명 해방 (확정)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
