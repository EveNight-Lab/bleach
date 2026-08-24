/**
 * 블리치 사신 서바이벌 - 사신 플레이어 엔티티 로직
 */

import { state } from '../core/GameState';
import { keysPressed, joystickState } from '../core/InputManager';
import { Synth } from '../core/AudioManager';
import { createShunpoAfterimages } from '../renderers/CanvasRenderer';

let hpRegenTimer = 0;

export function updatePlayer(
  dt: number,
  onGameOver: () => void,
  onLevelUp: () => void
) {
  const p = state.player;
  const sub = state.subStats;

  // 1. 피격 무적 타이머 감쇄
  if (p.invincibleTimer > 0) {
    p.invincibleTimer -= dt;
  }

  // 2. 순보 쿨타임 감쇄 (주 ス 스탯 쿨감 적용)
  if (p.shunpoCooldown > 0) {
    const cdReduction = sub ? sub.shunpoCdRed || 0 : 0;
    const effectiveMaxCd = Math.max(0.6, p.shunpoCooldownMax * (1 - cdReduction));
    p.shunpoCooldown -= dt;
  }

  // 3. 체력 자동 회복 (권 拳 서브스탯 5초당 회복)
  if (sub && sub.hpRegen5s > 0 && p.hp > 0 && p.hp < p.maxHp) {
    hpRegenTimer += dt;
    if (hpRegenTimer >= 5.0) {
      hpRegenTimer = 0;
      p.hp = Math.min(p.maxHp, p.hp + sub.hpRegen5s);
    }
  } else {
    hpRegenTimer = 0;
  }

  // 4. 방향 벡터 계산 (키보드 + 모바일 가상 조이스틱 통합)
  let moveX = 0;
  let moveY = 0;

  if (keysPressed['KeyW'] || keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W'] || keysPressed['ㅈ']) moveY -= 1;
  if (keysPressed['KeyS'] || keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S'] || keysPressed['ㄴ']) moveY += 1;
  if (keysPressed['KeyA'] || keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A'] || keysPressed['ㅁ']) moveX -= 1;
  if (keysPressed['KeyD'] || keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D'] || keysPressed['ㅇ']) moveX += 1;

  if (moveX !== 0 && moveY !== 0) {
    moveX *= Math.SQRT1_2;
    moveY *= Math.SQRT1_2;
  }

  // 가상 조이스틱 입력 합산
  if (joystickState.active && joystickState.intensity > 0) {
    moveX = Math.cos(joystickState.angle) * joystickState.intensity;
    moveY = Math.sin(joystickState.angle) * joystickState.intensity;
  }

  // 주(走) 스탯 이동속도 보너스 연산
  const moveSpeedBonus = sub ? sub.bonusMoveSpeed || 0 : 0;
  let currentSpeed = p.baseSpeed * (1 + (state.stats.ju * 0.08) + moveSpeedBonus);

  // ⚡ 불릿 타임 (매트릭스 슬로우 모션) 발동 동안 플레이어 역시 50% 정갈하게 완속 연출!
  if (state.bulletTimeTimer > 0) {
    currentSpeed *= 0.50;
  }

  p.vx = moveX * currentSpeed;
  p.vy = moveY * currentSpeed;

  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // 이동 방향에 따른 각도 설정
  if (moveX !== 0 || moveY !== 0) {
    p.angle = Math.atan2(moveY, moveX);
  }

  // 바운더리 제한 (아레나 구역 내)
  const halfW = state.arena.width / 2;
  const halfH = state.arena.height / 2;
  p.x = Math.max(-halfW + p.radius, Math.min(halfW - p.radius, p.x));
  p.y = Math.max(-halfH + p.radius, Math.min(halfH - p.radius, p.y));

  // 체력 0 이하 체크
  if (p.hp <= 0) {
    p.hp = 0;
    Synth.playGameOverSound();
    onGameOver();
  }
}

// ⚡ 순보 (Shunpo Dash) 발동
export function triggerShunpo(): boolean {
  const p = state.player;
  const sub = state.subStats;

  // 주(走) 스탯 쿨감(8%/pt) + 서브스탯 쿨감(shunpoCdRed) 합산 연산! (최대 75% 쿨감)
  const juCdRed = state.stats.ju * 0.08;
  const subCdRed = sub ? sub.shunpoCdRed || 0 : 0;
  const totalCdRed = Math.min(0.75, juCdRed + subCdRed);
  const effectiveMaxCd = Math.max(0.4, p.shunpoCooldownMax * (1 - totalCdRed));

  if (p.shunpoCooldown > 0) return false;

  p.shunpoCooldown = effectiveMaxCd;

  // ⚡ 시네마틱 매트릭스 불릿 타임 (지속 시간 2배 확장 0.70초!)
  const bulletBonus = sub ? sub.bulletSlowBonus || 0 : 0;
  const dur = 0.70 + bulletBonus;
  state.bulletTimeTimer = dur;
  state.maxBulletTimeTimer = dur;
  state.globalTimeScale = 0.2;

  // 순보 순간 이동 거리
  const dashDist = 190;
  const dashAngle = p.vx !== 0 || p.vy !== 0 ? Math.atan2(p.vy, p.vx) : p.angle;

  const startX = p.x;
  const startY = p.y;

  p.x += Math.cos(dashAngle) * dashDist;
  p.y += Math.sin(dashAngle) * dashDist;

  // 바운더리 바깥 탈출 방지
  const halfW = state.arena.width / 2;
  const halfH = state.arena.height / 2;
  p.x = Math.max(-halfW + p.radius, Math.min(halfW - p.radius, p.x));
  p.y = Math.max(-halfH + p.radius, Math.min(halfH - p.radius, p.y));

  // 무적 시간 부여
  const invincBonus = sub ? sub.shunpoInvinc || 0.4 : 0.4;
  p.invincibleTimer = Math.max(p.invincibleTimer, invincBonus);

  // 순보 자가 회복 (주 10% 울트라 레어 서브스탯)
  if (sub && sub.shunpoHeal > 0) {
    p.hp = Math.min(p.maxHp, p.hp + sub.shunpoHeal);
  }

  // 💥 순보 충격파 대미지 (shunpoDmg 서브스탯 발동 시 전방위 충격파 사출)
  if (sub && sub.shunpoDmg > 0) {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (dist <= 160) {
        enemy.hp -= sub.shunpoDmg;
      }
    }
  }

  // 잔상 효과 생성 및 효과음
  createShunpoAfterimages(startX, startY, p.x, p.y);
  Synth.playShunpoSound();

  return true;
}

// 피격 손상 처리 (긴급 순보 생존 및 👊 권 10% 체술 반격 충격파 포함)
export function takeDamage(dmg: number, onGameOver: () => void) {
  const p = state.player;
  const sub = state.subStats;

  if (p.invincibleTimer > 0 || state.isGameOver) return;

  // 권 (拳) 피해 감소율 적용
  const dmgReduction = sub ? sub.damageRed || 0 : 0;
  const actualDmg = Math.max(1, dmg * (1 - dmgReduction));

  p.hp -= actualDmg;
  state.playerHitFlashTimer = 0.2;

  // 👊 권 (拳) 10% 울트라 레어: 피격 시 220px 체술 반격 충격파 방출 (50 DMG)
  if (sub && sub.retaliationPulse > 0) {
    for (const enemy of state.enemies) {
      const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (dist <= 220 && dist > 0) {
        enemy.hp -= 50;
        enemy.kbVx = (enemy.x - p.x) / dist * 350;
        enemy.kbVy = (enemy.y - p.y) / dist * 350;
      }
    }
  }

  // 피격 무적 시간
  const invincDuration = sub ? sub.invincDuration || 0.6 : 0.6;
  p.invincibleTimer = invincDuration;

  Synth.playHitSound();

  // ⚡ 치명상 발생 시 긴급 자동 순보 발동
  if (p.hp <= 0 && !p.emergencyShunpoTriggered && state.stats.ju >= 3) {
    p.emergencyShunpoTriggered = true;
    p.hp = Math.floor(p.maxHp * 0.2); // 20% 체력으로 극적 생존!
    triggerShunpo();
    p.invincibleTimer = 1.5;
    return;
  }

  if (p.hp <= 0) {
    p.hp = 0;
    Synth.playGameOverSound();
    onGameOver();
  }
}
