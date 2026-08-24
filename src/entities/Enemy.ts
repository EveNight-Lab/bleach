/**
 * 블리치 사신 서바이벌 - 엘리트 호로 AI 및 스폰 시스템
 * 3대 전술 패턴 (Line/Fan/Diamond), 70% 바닥 고정 예고 구역, 실시간 확장 검기 파동
 */

import { state } from '../core/GameState';
import { Enemy } from '../types/game';
import { takeDamage } from './Player';
import { spawnExpGem } from './ExpGem';

let enemyIdCounter = 1;
let projectileIdCounter = 1;
let fastRefillTimer = 0;
let regularSpawnTimer = 0;

export function spawnInitialEnemies() {
  state.enemies = [];
  state.enemyProjectiles = [];
  for (let i = 0; i < 4; i++) {
    spawnSingleEliteHollow();
  }
}

export function spawnSingleEliteHollow() {
  const p = state.player;
  const elapsedTime = state.gameTime || 0;

  // 플레이어와의 안전 거리 보장 (최소 280px 거리 유지)
  let spawnX = 0;
  let spawnY = 0;
  let dist = 0;

  for (let attempt = 0; attempt < 10; attempt++) {
    const spawnAngle = Math.random() * Math.PI * 2;
    dist = 320 + Math.random() * 250;
    spawnX = p.x + Math.cos(spawnAngle) * dist;
    spawnY = p.y + Math.sin(spawnAngle) * dist;
    if (Math.hypot(p.x - spawnX, p.y - spawnY) >= 280) break;
  }

  // 호로 종류 무작위 롤링 (근거리, 신속, 탱커, 중거리 돌격, 세로 사출)
  const rand = Math.random();
  let type: 'Melee' | 'Speed' | 'Tank' | 'MidDash' | 'Projectile' = 'Melee';
  let name = '가이스트 호로';
  let radius = 20;
  let baseHp = 85; // 튼튼한 기본 근거리 탱킹!
  let baseSpeed = 125;
  let damage = 18;
  let color = '#ef4444'; // Red
  let expValue = 18;
  let pattern: 'Line' | 'Fan' | 'Diamond' | undefined;

  if (rand < 0.40) {
    type = 'Melee';
    name = '가이스트 호로 (■ 네모)';
    radius = 21;
    baseHp = 340; // 2배 강력한 정예 탱커!
    baseSpeed = 204;
    damage = 44; // 2배 데미지!
    color = '#ef4444';
    expValue = 48; // 2배 경험치
  } else if (rand < 0.75) {
    type = 'MidDash';
    name = '전술 세모 호로 (▲ 세모)';
    radius = 20;
    baseHp = 220; // 2배 체력
    baseSpeed = 120;
    damage = 52; // 2배 데미지
    color = '#f59e0b';
    expValue = 56;

    const pRand = Math.random();
    if (pRand < 0.35) pattern = 'Line';
    else if (pRand < 0.70) pattern = 'Fan';
    else pattern = 'Diamond';
  } else {
    type = 'Projectile';
    name = '세로 마름모 호로 (◆ 마름모)';
    radius = 20;
    baseHp = 160; // 2배 체력
    baseSpeed = 95;
    damage = 44; // 2배 데미지
    color = '#10b981';
    expValue = 56;
  }

  const hpMultiplier = 1 + (elapsedTime / 40);
  const dmgMultiplier = 1 + (elapsedTime / 80);

  const finalHp = Math.floor(baseHp * hpMultiplier);
  const finalDmg = Math.floor(damage * dmgMultiplier);

  const newEnemy: Enemy = {
    id: enemyIdCounter++,
    type,
    name,
    x: spawnX,
    y: spawnY,
    radius,
    hp: finalHp,
    maxHp: finalHp,
    speed: baseSpeed,
    damage: finalDmg,
    color,
    expValue,
    spawnGrace: 1.0,
    pattern,
    state: type === 'MidDash' ? 'chase' : undefined,
    stateTimer: type === 'MidDash' ? 1.2 + Math.random() * 1.0 : undefined,
    ceroCooldown: type === 'Projectile' ? 2.0 : undefined
  };

  state.enemies.push(newEnemy);
}

export function updateEnemies(
  dt: number,
  onGameOver: () => void,
  createHitParticles: (x: number, y: number, color: string, count: number) => void
) {
  const p = state.player;
  const mobDt = dt * state.globalTimeScale;
  const elapsedTime = state.gameTime || 0;

  // 📌 2트랙 쾌적 정예 스폰 시스템 (스폰 간격 2배 확대, 몬스터 밀도 절반 감소, 체력/공격력 2배 정예화)
  const regularInterval = Math.max(0.20, 4.4 * Math.pow(0.85, elapsedTime / 30));
  const maxEnemies = Math.min(35, 6 + Math.floor(elapsedTime / 15));
  const minEnemies = Math.min(18, 4 + Math.floor(elapsedTime / 25));
  const refillInterval = Math.max(0.08, 0.70 * Math.pow(0.88, elapsedTime / 35));

  // 1트랙: 긴급 급속 충원 트랙
  if (state.enemies.length < minEnemies) {
    fastRefillTimer += dt;
    if (fastRefillTimer >= refillInterval) {
      fastRefillTimer = 0;
      spawnSingleEliteHollow();
    }
  } else {
    fastRefillTimer = 0;
  }

  // 2트랙: 정기 지속 스폰 트랙
  regularSpawnTimer += dt;
  if (regularSpawnTimer >= regularInterval) {
    regularSpawnTimer = 0;
    if (state.enemies.length < maxEnemies) {
      spawnSingleEliteHollow();
    }
  }

  // 1. 적 AI 및 패턴 상태 머신
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];

    if (enemy.spawnGrace > 0) {
      enemy.spawnGrace -= mobDt;
    }

    let currentSpeed = enemy.speed;
    if (enemy.slowTimer && enemy.slowTimer > 0) {
      enemy.slowTimer -= mobDt;
      currentSpeed *= (1 - (enemy.slowFactor || 0.3));
    }

    // 📌 외곽 뺑뺑이 방지 길목 예측 연산 (Anti-Outer-Circling Flanking Interception)
    const isPlayerNearBorder = Math.abs(p.x) > (state.arena.width / 2 - 240) || Math.abs(p.y) > (state.arena.height / 2 - 240);
    const isPlayerMoving = p.vx !== 0 || p.vy !== 0;

    // 플레이어가 외곽에서 돌고 있을 때 진행 길목(predX/Y)을 선제적으로 차단!
    const targetX = (isPlayerNearBorder && isPlayerMoving && i % 2 === 0) ? p.x + p.vx * 0.75 : p.x;
    const targetY = (isPlayerNearBorder && isPlayerMoving && i % 2 === 0) ? p.y + p.vy * 0.75 : p.y;

    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);

    // 📌 중거리 전술 삼각형 호로 (MidDash) 상태 머신
    if (enemy.type === 'MidDash') {
      updateMidDashHollow(enemy, p, mobDt, onGameOver);
    } else if (enemy.type === 'Projectile') {
      // 📌 세로 사출 호로 (Projectile) AI: 플레이어 근접 시 1.25배 쾌속 후퇴(Flee)!
      const keepDist = 260;
      if (dist > 0.001) {
        const dirX = (p.x - enemy.x) / dist;
        const dirY = (p.y - enemy.y) / dist;

        if (dist < keepDist) {
          // 🏃 근접 접근 시: 1.25배 속도로 도망가며 조준 및 세로 충전 리셋!
          enemy.x -= dirX * currentSpeed * 1.25 * mobDt;
          enemy.y -= dirY * currentSpeed * 1.25 * mobDt;
          enemy.ceroCooldown = Math.max(2.0, enemy.ceroCooldown || 2.0);
          enemy.lockedAngle = undefined;
        } else if (dist > keepDist + 60) {
          // 적정 사거리 밖: 길목 예상 지점 또는 플레이어 방향 전진
          const moveDx = (dx !== 0 ? dx / Math.hypot(dx, dy) : dirX);
          const moveDy = (dy !== 0 ? dy / Math.hypot(dx, dy) : dirY);
          enemy.x += moveDx * currentSpeed * mobDt;
          enemy.y += moveDy * currentSpeed * mobDt;
        }

        // 안전 사거리(>=260px) 유지 시에만 세로 조준 및 70% 고정 락 발사!
        if (dist >= keepDist && enemy.ceroCooldown !== undefined) {
          enemy.ceroCooldown -= mobDt;

          // 📌 70% 고정 조준 로직: 2.0초 차징 중 0%~70%(1.4초) 동안만 실시간 조준하고, 70% 달성 시 조준선 고정!
          if (enemy.ceroCooldown <= 2.0) {
            const chargeRatio = 1 - (enemy.ceroCooldown / 2.0);
            if (chargeRatio < 0.70 || enemy.lockedAngle === undefined) {
              const aimDx = p.x - enemy.x;
              const aimDy = p.y - enemy.y;
              enemy.lockedAngle = Math.atan2(aimDy, aimDx);
            }
          } else {
            enemy.lockedAngle = undefined;
          }

          if (enemy.ceroCooldown <= 0) {
            enemy.ceroCooldown = 3.5;
            const fireAngle = enemy.lockedAngle !== undefined ? enemy.lockedAngle : Math.atan2(p.y - enemy.y, p.x - enemy.x);
            const fireVx = Math.cos(fireAngle);
            const fireVy = Math.sin(fireAngle);
            spawnCeroProjectile(enemy.x, enemy.y, fireVx, fireVy, enemy.damage);
            enemy.lockedAngle = undefined;
          }
        }
      }
    } else {
      // 📌 일반 근거리 추적 호로 (Melee): 외곽 뺑뺑이 시 길목 선점 이동
      const moveDist = Math.hypot(dx, dy);
      if (moveDist > 0.001) {
        enemy.x += (dx / moveDist) * currentSpeed * mobDt;
        enemy.y += (dy / moveDist) * currentSpeed * mobDt;
      }
    }

    // 📌 동일 타입 전술 호로 간격 넓히기 (110px) 및 몬스터-몬스터 밀쳐내기
    for (let j = i - 1; j >= 0; j--) {
      const other = state.enemies[j];
      const mdx = enemy.x - other.x;
      const mdy = enemy.y - other.y;
      const mdist = Math.hypot(mdx, mdy);

      // 동일 타입(MidDash / Projectile) 몬스터끼리는 110px 거리 확보하여 필드 전술 산개!
      let minDist = enemy.radius + other.radius;
      if (enemy.type === other.type && (enemy.type === 'MidDash' || enemy.type === 'Projectile')) {
        minDist = 110;
      }

      if (mdist < minDist && mdist > 0) {
        const overlap = (minDist - mdist) * 0.45;
        const pushX = (mdx / mdist) * overlap;
        const pushY = (mdy / mdist) * overlap;

        enemy.x += pushX;
        enemy.y += pushY;
        other.x -= pushX;
        other.y -= pushY;
      }
    }

    // 📌 넉백 물리 감쇄 (Smooth Friction Velocity Decay)
    if (enemy.kbVx || enemy.kbVy) {
      enemy.x += (enemy.kbVx || 0) * mobDt;
      enemy.y += (enemy.kbVy || 0) * mobDt;
      enemy.kbVx = (enemy.kbVx || 0) * 0.72; // 프레임당 72% 마찰 감쇄
      enemy.kbVy = (enemy.kbVy || 0) * 0.72;

      if (Math.hypot(enemy.kbVx, enemy.kbVy) < 4) {
        enemy.kbVx = 0;
        enemy.kbVy = 0;
      }
    }

    // 경기장 바운더리 클램핑
    const halfW = state.arena.width / 2 - enemy.radius;
    const halfH = state.arena.height / 2 - enemy.radius;
    enemy.x = Math.max(-halfW, Math.min(halfW, enemy.x));
    enemy.y = Math.max(-halfH, Math.min(halfH, enemy.y));

    // 몸통 접촉 피격 및 플레이어 밀쳐내기 판정
    let isTouchHit = false;
    if (enemy.spawnGrace <= 0) {
      if (dist < p.radius + enemy.radius && dist > 0) {
        // 플레이어-호로 밀쳐내기 충돌 물리
        const pushDist = (p.radius + enemy.radius - dist);
        enemy.x += (enemy.x - p.x) / dist * pushDist * 0.5;
        enemy.y += (enemy.y - p.y) / dist * pushDist * 0.5;

        if (enemy.type === 'MidDash') {
          if (enemy.state === 'chase') isTouchHit = true;
        } else {
          isTouchHit = true;
        }
      }
    }

    if (isTouchHit) {
      takeDamage(enemy.damage, onGameOver);
      createHitParticles((p.x + enemy.x) / 2, (p.y + enemy.y) / 2, '#ef4444', 6);
    }
  }

  // 2. 적 세로 투사체 이동 및 피격
  for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
    const proj = state.enemyProjectiles[i];
    proj.x += proj.vx * mobDt;
    proj.y += proj.vy * mobDt;

    const pDist = Math.hypot(p.x - proj.x, p.y - proj.y);
    if (pDist < p.radius + proj.radius) {
      takeDamage(proj.damage, onGameOver);
      createHitParticles(proj.x, proj.y, '#10b981', 8);
      state.enemyProjectiles.splice(i, 1);
      continue;
    }

    const halfW = state.arena.width / 2 + 100;
    const halfH = state.arena.height / 2 + 100;
    if (Math.abs(proj.x) > halfW || Math.abs(proj.y) > halfH) {
      state.enemyProjectiles.splice(i, 1);
    }
  }
}

// 📌 MidDash 삼각형 호로 3대 돌격 패턴 AI (Line / Fan / Diamond)
function updateMidDashHollow(
  enemy: Enemy,
  p: typeof state.player,
  mobDt: number,
  onGameOver: () => void
) {
  if (!enemy.state) enemy.state = 'chase';
  if (!enemy.stateTimer) enemy.stateTimer = 1.5;

  if (enemy.state === 'chase') {
    // 플레이어 추적
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.001) {
      enemy.x += (dx / dist) * enemy.speed * mobDt;
      enemy.y += (dy / dist) * enemy.speed * mobDt;
    }

    enemy.stateTimer -= mobDt;
    // 📌 플레이어가 돌격 사격 거리(380px) 이내로 들어왔을 때만 차징 시작! (멀리 떨어져 있을 때는 추적 유지)
    if (enemy.stateTimer <= 0 && dist <= 380) {
      enemy.state = 'charging';
      enemy.stateTimer = 2.0; // 📌 차징 시간 정확히 2.0초 설정!
      enemy.telegraphProgress = 0;
      enemy.lockedWorldX = enemy.x;
      enemy.lockedWorldY = enemy.y;
      enemy.lockedAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    } else if (enemy.stateTimer <= 0) {
      enemy.stateTimer = 0.25; // 사거리 밖이면 0.25초 후 다시 거리 체크
    }
  } else if (enemy.state === 'charging') {
    enemy.stateTimer -= mobDt;
    enemy.telegraphProgress = 1 - (enemy.stateTimer / 2.0);

    // 0% ~ 70% 차징 동안 조준선이 플레이어를 향해 부드럽게 실시간 조준
    if (enemy.telegraphProgress < 0.7) {
      enemy.lockedWorldX = enemy.x;
      enemy.lockedWorldY = enemy.y;
      enemy.lockedAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    }

    // 📌 Fan & Diamond 착지 목표 지점 맵 바닥 고정 명시 연산!
    const actAngle = enemy.lockedAngle !== undefined ? enemy.lockedAngle : Math.atan2(p.y - enemy.y, p.x - enemy.x);
    const originX = enemy.lockedWorldX !== undefined ? enemy.lockedWorldX : enemy.x;
    const originY = enemy.lockedWorldY !== undefined ? enemy.lockedWorldY : enemy.y;

    if (enemy.pattern === 'Fan') {
      enemy.targetLandingX = originX + Math.cos(actAngle) * 380;
      enemy.targetLandingY = originY + Math.sin(actAngle) * 380;
    } else if (enemy.pattern === 'Diamond') {
      enemy.targetLandingX = originX + Math.cos(actAngle) * 500;
      enemy.targetLandingY = originY + Math.sin(actAngle) * 500;
    }

    if (enemy.stateTimer <= 0) {
      enemy.state = 'action';

      if (enemy.pattern === 'Line') {
        enemy.stateTimer = 0.42; // 0.42초 630px 초고속 번개 돌격!
        enemy.actionVx = Math.cos(actAngle) * 1400;
        enemy.actionVy = Math.sin(actAngle) * 1400;
      } else if (enemy.pattern === 'Fan') {
        enemy.stateTimer = 0.40; // 0.40초 380px 부채꼴 끝 지점까지 돌격 대쉬!
      } else if (enemy.pattern === 'Diamond') {
        enemy.stateTimer = 0.45; // 0.45초 500px 대형 공중 도약 착지
      }
      enemy.actionProgress = 0;
    }
  } else if (enemy.state === 'action') {
    enemy.stateTimer -= mobDt;
    const maxActTime = enemy.pattern === 'Line' ? 0.42 : (enemy.pattern === 'Diamond' ? 0.45 : 0.40);
    enemy.actionProgress = 1 - (enemy.stateTimer / maxActTime);

    const actAngle = enemy.lockedAngle !== undefined ? enemy.lockedAngle : 0;
    const originX = enemy.lockedWorldX !== undefined ? enemy.lockedWorldX : enemy.x;
    const originY = enemy.lockedWorldY !== undefined ? enemy.lockedWorldY : enemy.y;

    if (enemy.pattern === 'Line') {
      // 📌 Line: 630px 초고속 1400px/s 번개 돌격
      enemy.x += (enemy.actionVx || 0) * mobDt;
      enemy.y += (enemy.actionVy || 0) * mobDt;

      const distToP = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      if (distToP < p.radius + enemy.radius) {
        takeDamage(enemy.damage, onGameOver);
      }
    } else if (enemy.pattern === 'Fan') {
      // 📌 Fan: 부채꼴 끝 지점(380px)까지 대쉬 이동하며 경로 전체 120도 부채꼴 범위 피격 대미지!
      const landX = enemy.targetLandingX !== undefined ? enemy.targetLandingX : originX;
      const landY = enemy.targetLandingY !== undefined ? enemy.targetLandingY : originY;
      const t = Math.min(1.0, enemy.actionProgress);

      enemy.x = originX + (landX - originX) * t;
      enemy.y = originY + (landY - originY) * t;

      const currentWaveRange = 380 * Math.min(1.0, enemy.actionProgress * 1.3);
      const distToOrigin = Math.hypot(p.x - originX, p.y - originY);

      if (distToOrigin <= currentWaveRange) {
        const pAngle = Math.atan2(p.y - originY, p.x - originX);
        let angleDiff = Math.abs(pAngle - actAngle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff <= (Math.PI / 3)) { // 120도 정통 부채꼴 각도
          takeDamage(enemy.damage, onGameOver);
        }
      }
    } else if (enemy.pattern === 'Diamond') {
      // 📌 Diamond: 500px 바닥 착지점(targetLandingX/Y)으로 도약 이동 후 마름모 (◆) 착지 충격파
      const landX = enemy.targetLandingX !== undefined ? enemy.targetLandingX : originX;
      const landY = enemy.targetLandingY !== undefined ? enemy.targetLandingY : originY;
      const t = Math.min(1.0, enemy.actionProgress);

      enemy.x = originX + (landX - originX) * t;
      enemy.y = originY + (landY - originY) * t;

      if (enemy.stateTimer <= 0) {
        // 📌 정밀 마름모(Taxicab/Manhattan Distance) 피격 연산: Math.abs(dx) + Math.abs(dy) <= 220
        // 시각적 마름모 도형 외곽선 밖에서 피격되는 판정 오류 완전 차단!
        const dx = Math.abs(p.x - landX);
        const dy = Math.abs(p.y - landY);
        if (dx + dy <= 220) {
          takeDamage(enemy.damage, onGameOver);
        }
      }
    }

    if (enemy.stateTimer <= 0) {
      enemy.state = 'cooldown';
      enemy.stateTimer = 1.0;
    }
  } else if (enemy.state === 'cooldown') {
    enemy.stateTimer -= mobDt;
    if (enemy.stateTimer <= 0) {
      enemy.state = 'chase';
      enemy.stateTimer = 1.2;
    }
  }
}

function spawnCeroProjectile(x: number, y: number, dirX: number, dirY: number, damage: number) {
  const speed = 570; // 1.5배 초고속 세로 사출! (570px/s)
  state.enemyProjectiles.push({
    id: projectileIdCounter++,
    x,
    y,
    vx: dirX * speed,
    vy: dirY * speed,
    radius: 9,
    damage: Math.floor(damage * 0.9),
    color: '#10b981'
  });
}

export function killEnemy(
  index: number,
  createHitParticles: (x: number, y: number, color: string, count: number) => void
) {
  const enemy = state.enemies[index];
  if (!enemy) return;

  createHitParticles(enemy.x, enemy.y, enemy.color, 12);
  spawnExpGem(enemy.x, enemy.y, enemy.expValue);
  state.kills += 1;
  state.enemies.splice(index, 1);
}
