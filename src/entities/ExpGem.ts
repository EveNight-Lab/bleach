/**
 * 블리치 사신 서바이벌 - 영력 경험치 구체 엔티티
 */

import { state } from '../core/GameState';
import { ExpGem } from '../types/game';

let gemIdCounter = 1;

export function spawnExpGem(x: number, y: number, value: number) {
  state.expGems.push({
    id: gemIdCounter++,
    x,
    y,
    value,
    radius: 6
  });
}

export function updateExpGems(dt: number, onLevelUpCheck: () => void) {
  const p = state.player;
  const sub = state.subStats;

  // 귀(鬼) 스탯 및 서브스탯 기반 자석 흡입 범위 연산
  const baseMagnetRadius = sub ? sub.magnetRadius || 180 : 180;
  const effectiveMagnetRadius = baseMagnetRadius + (state.stats.gwi * 45);

  for (let i = state.expGems.length - 1; i >= 0; i--) {
    const gem = state.expGems[i];
    const dx = p.x - gem.x;
    const dy = p.y - gem.y;
    const dist = Math.hypot(dx, dy);

    // 자석 범위 안이면 플레이어로 빠른 이동
    if (dist < effectiveMagnetRadius && dist > 0) {
      const pullSpeed = Math.min(800, 350 + (effectiveMagnetRadius - dist) * 2.5);
      gem.x += (dx / dist) * pullSpeed * dt;
      gem.y += (dy / dist) * pullSpeed * dt;
    }

    // 플레이어 획득 검사
    if (dist < p.radius + gem.radius) {
      state.exp += gem.value;
      state.expGems.splice(i, 1);
      onLevelUpCheck();
    }
  }
}
