import React, { useState } from 'react';
import { Play, Volume2, VolumeX, Shield, Zap, Sparkles, Smartphone, Keyboard } from 'lucide-react';
import { rollRandomCharacter } from '../managers/CharacterRoll';
import { Synth } from '../core/AudioManager';
import { state } from '../core/GameState';

interface TitleScreenProps {
  onStartRoll: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartRoll }) => {
  const [isMuted, setIsMuted] = useState(Synth.isMuted);

  const toggleSound = () => {
    Synth.isMuted = !Synth.isMuted;
    setIsMuted(Synth.isMuted);
  };

  const handleRoll = () => {
    rollRandomCharacter();
    onStartRoll();
  };

  return (
    <div className="relative w-dvw h-dvh overflow-hidden bg-slate-950 flex items-center justify-center p-3 sm:p-6">
      {/* Background Animated Spiritual Particles & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      {/* Sound Toggle Button (Safe Area Top Right) */}
      <button
        onClick={toggleSound}
        className="absolute top-[max(1rem,var(--sat))] right-[max(1rem,var(--sar))] z-20 p-2.5 rounded-full glass-panel text-slate-300 hover:text-white hover:border-blue-500/50 transition-all active:scale-95"
        aria-label="음소거 토글"
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-sky-400" />}
      </button>

      {/* Main Glass Panel Card */}
      <div className="relative z-10 w-full max-w-lg glass-panel mobile-ls-panel rounded-2xl p-4 sm:p-6 flex flex-col items-center text-center shadow-2xl border border-slate-700/50 max-h-[96dvh] my-auto">
        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 mobile-ls-title mb-3">
          블리치 사신 서바이벌
        </h1>

        {/* Start Game Button */}
        <button
          onClick={handleRoll}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleRoll();
          }}
          className="w-full py-3 sm:py-3.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-lg shadow-blue-500/25 flex items-center justify-center transition-all transform active:scale-95 hover:scale-[1.01] cursor-pointer mobile-ls-btn mb-3 touch-manipulation"
        >
          <span>사신 무작위 추첨 및 시작</span>
        </button>

        {/* Controls Guide Box */}
        <div className="w-full bg-slate-900/80 rounded-xl p-2.5 sm:p-3 border border-slate-800 text-left">
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
              <Keyboard className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-100">PC:</span> WASD / Space
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
              <Smartphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-100">모바일:</span> 터치 조이스틱 & 순보
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
