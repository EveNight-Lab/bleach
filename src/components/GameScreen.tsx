import React, { useRef, useEffect, useState } from 'react';
import { HUD } from './HUD';
import { TouchControls } from './TouchControls';
import { LevelUpModal } from './LevelUpModal';
import { ShikaiModal } from './ShikaiModal';
import { GameOverModal } from './GameOverModal';
import { startBattleLoop, stopBattleLoop } from '../core/GameLoop';
import { setupKeyboardListeners } from '../core/InputManager';
import { state } from '../core/GameState';

interface GameScreenProps {
  onReturnToTitle: () => void;
  onReRollCharacter: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onReturnToTitle, onReRollCharacter }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState({ ...state });
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const [isShikaiOpen, setIsShikaiOpen] = useState(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState(false);

  useEffect(() => {
    setupKeyboardListeners();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Start battle engine loop
    startBattleLoop(
      canvasRef.current,
      () => {
        setIsGameOverOpen(true);
      },
      () => {
        setIsLevelUpOpen(true);
      },
      () => {
        setIsShikaiOpen(true);
      }
    );

    // Sync HUD state ticker
    const hudInterval = setInterval(() => {
      setGameState({ ...state });
    }, 100);

    return () => {
      clearInterval(hudInterval);
      stopBattleLoop();
    };
  }, []);

  const handlePauseToggle = () => {
    state.isPaused = !state.isPaused;
    setGameState({ ...state });
  };

  const handleLevelUpClose = () => {
    setIsLevelUpOpen(false);
  };

  const handleShikaiClose = () => {
    setIsShikaiOpen(false);
  };

  const handleRetry = () => {
    setIsGameOverOpen(false);
    onReRollCharacter();
  };

  return (
    <div className="relative w-dvw h-dvh overflow-hidden bg-slate-950">
      {/* HTML5 Canvas Viewport */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block touch-none"
      />

      {/* Responsive Glass HUD */}
      <HUD gameState={gameState} onPauseToggle={handlePauseToggle} />

      {/* Mobile Touch Joystick & Shunpo Action Button */}
      <TouchControls />

      {/* Level Up Cards Overlay Modal */}
      <LevelUpModal
        isOpen={isLevelUpOpen}
        onClose={handleLevelUpClose}
        onReTriggerLevelUp={() => {
          setIsLevelUpOpen(false);
          setTimeout(() => {
            setIsLevelUpOpen(true);
          }, 30);
        }}
      />

      {/* ⚔️ 참백도 시해 각성 5-릴 슬롯머신 모달 */}
      <ShikaiModal
        isOpen={isShikaiOpen}
        onClose={handleShikaiClose}
      />

      {/* Game Over Result Overlay Modal */}
      <GameOverModal
        isOpen={isGameOverOpen}
        onRetry={handleRetry}
        onReturnToTitle={onReturnToTitle}
      />
    </div>
  );
};
