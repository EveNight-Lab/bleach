/**
 * 블리치 사신 서바이벌 - 메인 게임 룹 (60 FPS Engine Ticker)
 */

import { state, resetGameState } from './GameState';
import { updatePlayer } from '../entities/Player';
import { updateEnemies, spawnInitialEnemies } from '../entities/Enemy';
import { dispatchBasicAttack, updateAttacks } from '../entities/BasicAttack';
import { updateExpGems } from '../entities/ExpGem';
import { checkExpLevelUp } from '../managers/StatManager';
import { renderCanvas, createHitParticles } from '../renderers/CanvasRenderer';

let animFrameId: number | null = null;
let lastTime = 0;

export function startBattleLoop(
  canvas: HTMLCanvasElement,
  onGameOverTrigger: () => void,
  onLevelUpTrigger: () => void
) {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  resetGameState();
  spawnInitialEnemies();

  lastTime = performance.now();

  const loop = (now: number) => {
    if (state.screen !== 'battle') return;

    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // 캔버스 크기 화면에 자동 맞춤
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      if (!state.isPaused && !state.isGameOver) {
        update(dt, onGameOverTrigger, onLevelUpTrigger);
      }

      renderCanvas(ctx, canvas.width, canvas.height);
    }

    animFrameId = requestAnimationFrame(loop);
  };

  animFrameId = requestAnimationFrame(loop);
}

export function stopBattleLoop() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

function update(
  dt: number,
  onGameOverTrigger: () => void,
  onLevelUpTrigger: () => void
) {
  state.gameTime += dt;

  // 1. 불릿 타임 (시간 완속 0.2배속 -> 1.0배속 복구 커브 연출)
  if (state.bulletTimeTimer > 0) {
    state.bulletTimeTimer -= dt;
    const maxDur = state.maxBulletTimeTimer > 0 ? state.maxBulletTimeTimer : 0.35;
    const progress = Math.max(0, 1 - (state.bulletTimeTimer / maxDur));
    state.globalTimeScale = 0.2 + (progress * progress) * 0.8;

    if (state.bulletTimeTimer <= 0) {
      state.bulletTimeTimer = 0;
      state.globalTimeScale = 1.0;
    }
  }

  // 2. 플레이어 이동 및 무적
  updatePlayer(dt, onGameOverTrigger, () => checkExpLevelUp(onLevelUpTrigger));

  // 3. 자동 평타 사출 (스탯 및 선택지 상승폭 기반 자연 쿨타임 감소)
  state.attackTimer += dt;
  const baseCd = state.assignedAttack && state.assignedAttack.baseCd ? state.assignedAttack.baseCd : 0.35;
  const chamSpdRed = state.stats.cham * 0.015;
  const subAtkSpdRed = state.subStats ? state.subStats.atkSpeedBonus || 0 : 0;
  const totalAtkSpdRed = chamSpdRed + subAtkSpdRed;
  const currentAttackCd = Math.max(0.08, baseCd * (1 - totalAtkSpdRed));

  if (state.attackTimer >= currentAttackCd) {
    state.attackTimer = 0;
    dispatchBasicAttack();
  }

  // 4. 검기 투사체 이동
  updateAttacks(dt);

  // 5. 엘리트 호로 AI 이동 & 스폰
  updateEnemies(dt, onGameOverTrigger, createHitParticles);

  // 6. 영합 구체 수집
  updateExpGems(dt, () => checkExpLevelUp(onLevelUpTrigger));
}
