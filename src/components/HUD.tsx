import React from 'react';
import { Heart, Zap, Shield, Swords, Pause, Volume2, VolumeX, Flame } from 'lucide-react';
import { GameState } from '../types/game';
import { Synth } from '../core/AudioManager';
import { keysPressed } from '../core/InputManager';

interface HUDProps {
  gameState: GameState;
  onPauseToggle: () => void;
}

export const HUD: React.FC<HUDProps> = ({ gameState, onPauseToggle }) => {
  const { player, level, exp, maxExp, kills, gameTime } = gameState;

  const mins = Math.floor(gameTime / 60).toString().padStart(2, '0');
  const secs = Math.floor(gameTime % 60).toString().padStart(2, '0');

  const hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));
  const expRatio = Math.max(0, Math.min(1, exp / maxExp));

  return (
    <div className="absolute top-[max(0.35rem,var(--sat))] left-[max(0.5rem,var(--sal))] right-[max(0.5rem,var(--sar))] z-20 pointer-events-none flex flex-col gap-1">
      {/* Ultra-Minimalist Top Status Bar */}
      <div className="w-full flex items-center justify-between gap-2">
        {/* Left: Level, HP, Time & Kills in 1 Compact Glass Pill */}
        <div className="glass-panel rounded-lg px-2.5 py-1 pointer-events-auto flex items-center gap-2 text-[11px] font-bold text-slate-200 shadow-md">
          {/* Level */}
          <div className="text-amber-400 font-black">
            <span>Lv.{level}</span>
          </div>

          <div className="h-3 w-px bg-slate-700/80" />

          {/* HP */}
          <div className="font-mono text-rose-400">
            <span>HP {Math.round(player.hp)} / {Math.round(player.maxHp)}</span>
          </div>

          <div className="h-3 w-px bg-slate-700/80" />

          {/* Timer */}
          <div className="font-mono text-sky-300">
            <span>{mins}:{secs}</span>
          </div>

          <div className="h-3 w-px bg-slate-700/80" />

          {/* Kills */}
          <div className="text-rose-300">
            <span>{kills}마리</span>
          </div>
        </div>

        {/* Right: Small Pause Button */}
        <button
          onClick={onPauseToggle}
          className="p-1.5 rounded-lg glass-panel text-slate-200 hover:text-white pointer-events-auto transition-all active:scale-95 cursor-pointer shadow-md"
          aria-label="일시정지"
        >
          <Pause className="w-4 h-4 text-slate-200" />
        </button>
      </div>

      {/* 🛠️ 실시간 디버그 현황 핫 로그 오버레이 */}
      <div className="w-full flex items-center justify-between pointer-events-none">
        <div className="glass-panel rounded-lg px-2.5 py-1 text-[10px] font-mono text-amber-300 flex items-center gap-2 border border-amber-500/40 shadow-lg pointer-events-auto">
          <span className="font-bold text-amber-400">🛠️ 디버그 로그:</span>
          <span>일시정지: <strong className={gameState.isPaused ? 'text-rose-400 font-black' : 'text-emerald-400'}>{gameState.isPaused ? '🔴 TRUE (일시정지됨)' : '🟢 FALSE (정상 가동 중)'}</strong></span>
          <div className="h-2.5 w-px bg-slate-700" />
          <span>키 입력: W:{keysPressed['w'] ? '🟩ON' : 'off'} A:{keysPressed['a'] ? '🟩ON' : 'off'} S:{keysPressed['s'] ? '🟩ON' : 'off'} D:{keysPressed['d'] ? '🟩ON' : 'off'}</span>
          <div className="h-2.5 w-px bg-slate-700" />
          <span>플레이어 좌표: ({Math.round(player.x)}, {Math.round(player.y)})</span>
        </div>
      </div>

      {/* HP & EXP Bars with High-Contrast Glowing Borders */}
      <div className="w-full pointer-events-none flex flex-col gap-1 max-w-sm">
        {/* HP Bar with Neon Rose Border */}
        <div className="w-full bg-slate-950/90 rounded-full h-2 border border-rose-500/80 overflow-hidden shadow-sm shadow-rose-950/80">
          <div
            className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 transition-all duration-150 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.9)]"
            style={{ width: `${hpRatio * 100}%` }}
          />
        </div>

        {/* EXP Bar with Neon Sky Border */}
        <div className="w-full bg-slate-950/90 rounded-full h-1.5 border border-sky-400/80 overflow-hidden shadow-sm shadow-sky-950/80">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-blue-400 transition-all duration-150 rounded-full shadow-[0_0_6px_rgba(56,189,248,0.9)]"
            style={{ width: `${expRatio * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
