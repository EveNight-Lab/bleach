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
    e.stopPropagation();
    triggerShunpo();
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

      {/* Right: Shunpo Action Button */}
      <div className="absolute right-[max(0.75rem,var(--sar))] bottom-[max(0.75rem,var(--sab))] pointer-events-auto flex items-center gap-3">
        <button
          onTouchStart={handleShunpoBtn}
          onClick={handleShunpoBtn}
          disabled={shunpoCdProgress > 0}
          className={`w-14 h-14 sm:w-18 sm:h-18 rounded-full glass-panel flex flex-col items-center justify-center relative shadow-lg transition-transform active:scale-95 cursor-pointer touch-none opacity-85 hover:opacity-100 ${
            shunpoCdProgress > 0 ? 'opacity-50 border-slate-700' : 'border-sky-400/80 reatsu-glow'
          }`}
          aria-label="순보 순간이동"
        >
          {/* Cooldown Overlay Pie */}
          {shunpoCdProgress > 0 && (
            <div
              className="absolute inset-0 rounded-full bg-slate-950/85 flex items-center justify-center text-[10px] font-mono font-bold text-sky-300"
            >
              {Math.ceil(state.player.shunpoCooldown * 10) / 10}s
            </div>
          )}

          <span className="text-[10px] sm:text-xs font-black text-sky-200 tracking-wider">순보</span>
        </button>
      </div>
    </div>
  );
};
