import React, { useRef, useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { updateJoystickVector, resetJoystick } from '../core/InputManager';
import { triggerShunpo } from '../entities/Player';
import { state } from '../core/GameState';

export const TouchControls: React.FC = () => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [shunpoCdProgress, setShunpoCdProgress] = useState(0);

  // Shunpo cooldown update ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const p = state.player;
      if (p.shunpoCooldown > 0) {
        setShunpoCdProgress(p.shunpoCooldown / p.shunpoCooldownMax);
      } else {
        setShunpoCdProgress(0);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const touch = e.touches[0];
    if (!touch) return;

    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;

    const maxRadius = rect.width / 2;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setStickPos({ x: dx, y: dy });
    updateJoystickVector(dx, dy, maxRadius);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setStickPos({ x: 0, y: 0 });
    resetJoystick();
  };

  const handleShunpoBtn = (e: React.TouchEvent | React.MouseEvent) => {
    if (e.type === 'touchstart') {
      e.preventDefault(); // 모바일 터치 시 중복 synthetic onClick 발동 방지!
    }
    e.stopPropagation();
    triggerShunpo();
  };

  const handleShikaiBtn = (e: React.TouchEvent | React.MouseEvent) => {
    if (e.type === 'touchstart') {
      e.preventDefault();
    }
    e.stopPropagation();
    if (state.shikai) {
      state.attackTimer = 999;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none">
      {/* Left: Virtual Touch Joystick */}
      <div
        className="absolute left-[max(0.75rem,var(--sal))] bottom-[max(0.75rem,var(--sab))] pointer-events-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          ref={joystickRef}
          className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-slate-900/50 backdrop-blur-sm border border-slate-700/70 flex items-center justify-center relative shadow-lg touch-none opacity-80 hover:opacity-100"
        >
          {/* Stick */}
          <div
            className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-sky-600 to-blue-400 border border-sky-200/50 shadow transition-transform duration-75"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`
            }}
          />
        </div>
      </div>

      {/* Right: Action Buttons (Main Shikai at bottom-right, Shunpo at bottom-left of Shikai) */}
      <div className="absolute right-[max(0.75rem,var(--sar))] bottom-[max(0.75rem,var(--sab))] pointer-events-auto flex items-end gap-2.5 sm:gap-3">
        {/* Shunpo Flash Step Button (Placed at bottom-left of Shikai) */}
        <button
          onTouchStart={handleShunpoBtn}
          onClick={handleShunpoBtn}
          disabled={shunpoCdProgress > 0}
          className={`w-12 h-12 sm:w-14 sm:h-14 mb-1 rounded-full glass-panel flex flex-col items-center justify-center relative shadow-lg transition-transform active:scale-95 cursor-pointer touch-none opacity-85 hover:opacity-100 ${
            shunpoCdProgress > 0 ? 'opacity-50 border-slate-700' : 'border-sky-400/80 reatsu-glow'
          }`}
          aria-label="순보 순간이동"
        >
          {shunpoCdProgress > 0 && (
            <div className="absolute inset-0 rounded-full bg-slate-950/85 flex items-center justify-center text-[9px] font-mono font-bold text-sky-300">
              {Math.ceil(state.player.shunpoCooldown * 10) / 10}s
            </div>
          )}
          <span className="text-[10px] font-black text-sky-200 tracking-wider">순보</span>
        </button>

        {/* Main Shikai Action Button (Multi-Color Stack & Reverse Drain Gauge) */}
        {(() => {
          const shikai = state.shikai;
          const isContinuous = shikai ? (shikai.archetype === 'B1_Area' || shikai.archetype === 'B2_Compact') : false;
          const STACK_COLORS = ['#f59e0b', '#f97316', '#ef4444', '#00e5ff'];
          const baseColor = STACK_COLORS[Math.min(3, state.shikaiStacks)];
          const fillDeg = isContinuous && state.shikaiActive
            ? (state.shikaiGauge * 360) // 활성화 중 역회전 360도 -> 0도 드레인!
            : (state.shikaiGauge * 360); // 차징 중 0도 -> 360도 충전!

          return (
            <button
              onTouchStart={handleShikaiBtn}
              onClick={handleShikaiBtn}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center relative shadow-2xl transition-all active:scale-95 cursor-pointer touch-none overflow-hidden ${
                shikai
                  ? state.shikaiActive
                    ? 'bg-slate-950 border-2 border-cyan-400 text-cyan-300 ring-4 ring-cyan-500/40 animate-pulse'
                    : 'bg-slate-950 border-2 border-amber-400 text-amber-300'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-600'
              }`}
              aria-label="시해 해방"
            >
              {/* Conic Gradient Pie Gauge Overlay */}
              {shikai && (
                <div
                  className="absolute inset-0 rounded-full pointer-events-none opacity-45"
                  style={{
                    background: `conic-gradient(${baseColor} ${fillDeg}deg, transparent ${fillDeg}deg)`
                  }}
                />
              )}

              {/* Stack / Active Badge (Top Right) */}
              {shikai && (
                <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black font-mono shadow-md ${
                  isContinuous && state.shikaiActive
                    ? 'bg-cyan-500 text-slate-950 animate-bounce'
                    : 'bg-amber-500 text-slate-950'
                }`}>
                  {isContinuous ? (state.shikaiActive ? 'ON' : 'OFF') : `x${state.shikaiStacks}`}
                </div>
              )}

              <Zap className={`w-5 h-5 sm:w-6 sm:h-6 fill-current mb-0.5 z-10 ${
                isContinuous && state.shikaiActive ? 'text-cyan-300 animate-spin-slow' : 'text-amber-300'
              }`} />
              <span className="text-[10px] sm:text-xs font-black tracking-wider z-10">
                {shikai ? (isContinuous ? (state.shikaiActive ? '유지중' : '시해') : '시해') : '잠금'}
              </span>
            </button>
          );
        })()}
      </div>
    </div>
  );
};
