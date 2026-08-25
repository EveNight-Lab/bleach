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

function lerpAngle(current: number, target: number, speed: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(1.0, speed);
}

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
    pattern = 'Line'; // 📌 중거리 전술 세모 호로는 100% 직관적인 직선(Line) 돌격 단일 패턴으로 통일!
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

  // 📌 40% 확률로 플레이어 진행 길목을 선제 차단하는 '전술 예측 길목 차단 AI' 특성 부여!
  const isPredictive = Math.random() < 0.40;

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
    pattern,
    spawnGrace: 0.6,
    isPredictive,
    ceroCooldown: type === 'Projectile' ? 1.0 + Math.random() * 1.5 : undefined
  };

  state.enemies.push(newEnemy);
}

export function updateEnemies(
  dt: number,
  onGameOver: () => void,
  createHitParticles: (x: number, y: number, color: string, count: number) => void
) {
  const p = state.player;

  if (state.isGameOver) return;

  const mobDt = dt * state.globalTimeScale;
  state.gameTime += mobDt;

  // 1트랙: 🚨 긴급 쾌속 충원 (필드 호로가 8마리 미만으로 감소 시 0.35초마다 번개 충원!)
  const minThreshold = 8;
  if (state.enemies.length < minThreshold) {
    fastRefillTimer += mobDt;
    if (fastRefillTimer >= 0.35) {
      fastRefillTimer = 0;
      spawnSingleEliteHollow();
    }
  } else {
    fastRefillTimer = 0;
  }

  // 2트랙: 🌊 정기 웨이브 지속 스폰 (2.5초 간격)
  regularSpawnTimer += mobDt;
  const regularInterval = 2.5; // 쾌적한 웨이브 2.5초 스폰 간격
  const maxEnemies = Math.min(35, 8 + Math.floor(state.gameTime / 12));

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

    // 📌 40% 확률로 생성된 '길목 예측 차단 AI(isPredictive)' 전술 타겟 산출
    const isMoving = p.vx !== 0 || p.vy !== 0;
    let targetX = p.x;
    let targetY = p.y;

    const halfArenaW = state.arena.width / 2 - 40;
    const halfArenaH = state.arena.height / 2 - 40;

    if (enemy.isPredictive && isMoving) {
      // 플레이어가 1.4초 후 위치할 예상 길목 좌표 선제 산출
      const leadX = p.x + p.vx * 1.4;
      const leadY = p.y + p.vy * 1.4;
      targetX = Math.max(-halfArenaW, Math.min(halfArenaW, leadX));
      targetY = Math.max(-halfArenaH, Math.min(halfArenaH, leadY));
    }

    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const distToRealP = Math.hypot(p.x - enemy.x, p.y - enemy.y);

    // 📌 중거리 전술 삼각형 호로 (MidDash) 상태 머신
    if (enemy.type === 'MidDash') {
      updateMidDashHollow(enemy, p, mobDt, onGameOver, targetX, targetY);
    } else if (enemy.type === 'Projectile') {
      // 📌 원거리 세로 마름모 호로 (◆ 마름모)
      const isCharging = enemy.ceroCooldown !== undefined && enemy.ceroCooldown <= 2.0;

      if (!isCharging) {
        const keepDist = 260;
        if (distToRealP > 0.001) {
          const dirX = (p.x - enemy.x) / distToRealP;
          const dirY = (p.y - enemy.y) / distToRealP;

          if (distToRealP < keepDist) {
            enemy.x -= dirX * currentSpeed * 1.1 * mobDt;
            enemy.y -= dirY * currentSpeed * 1.1 * mobDt;
          } else if (distToRealP > keepDist + 60) {
            const moveDx = (dx !== 0 ? dx / Math.hypot(dx, dy) : dirX);
            const moveDy = (dy !== 0 ? dy / Math.hypot(dx, dy) : dirY);
            enemy.x += moveDx * currentSpeed * mobDt;
            enemy.y += moveDy * currentSpeed * mobDt;
          }
        }
      }

      // 세로 조준 및 70% 고정 락 발사!
      if (enemy.ceroCooldown !== undefined) {
        // 📌 원거리 뭉침 체크: 다른 Projectile 호로와 90px 이내로 뭉쳐있다면 차징 보류 및 공간 확보 우선!
        let isStacked = false;
        for (const other of state.enemies) {
          if (other.id !== enemy.id && other.type === 'Projectile') {
            const odist = Math.hypot(enemy.x - other.x, enemy.y - other.y);
            if (odist < 95) {
              isStacked = true;
              // 뭉쳐있는 경우 서로 멀어지도록 부드러운 위치 분산 벡터 적용
              if (odist > 0) {
                const repMult = (95 - odist) * 1.2;
                enemy.x += ((enemy.x - other.x) / odist) * repMult * mobDt;
                enemy.y += ((enemy.y - other.y) / odist) * repMult * mobDt;
              }
              break;
            }
          }
        }

        // 뭉쳐있다면 세로 차징 쿨다운 리셋 (공격 보류 및 재배치)
        if (isStacked) {
          if (enemy.ceroCooldown < 2.0) {
            enemy.ceroCooldown = 2.0; // 뭉친 동안 차징 중단
          }
          enemy.lockedAngle = undefined;
        } else {
          enemy.ceroCooldown -= mobDt;

          if (enemy.ceroCooldown <= 2.0) {
            const chargeRatio = 1 - (enemy.ceroCooldown / 2.0);
            if (chargeRatio < 0.70 || enemy.lockedAngle === undefined) {
              const aimDx = dx;
              const aimDy = dy;
              const desiredAngle = Math.atan2(aimDy, aimDx);
              if (enemy.lockedAngle === undefined) {
                enemy.lockedAngle = desiredAngle;
              } else {
                enemy.lockedAngle = lerpAngle(enemy.lockedAngle, desiredAngle, 4.5 * mobDt);
              }
            }
          } else {
            enemy.lockedAngle = undefined;
          }

          if (enemy.ceroCooldown <= 0) {
            enemy.ceroCooldown = 3.5;
            const fireAngle = enemy.lockedAngle !== undefined ? enemy.lockedAngle : Math.atan2(dy, dx);
            const fireVx = Math.cos(fireAngle);
            const fireVy = Math.sin(fireAngle);
            spawnCeroProjectile(enemy.x, enemy.y, fireVx, fireVy, enemy.damage);
            enemy.lockedAngle = undefined;
          }
        }
      }
    } else {
      // 📌 일반 근거리 추적 호로 (Melee)
      const moveDist = Math.hypot(dx, dy);
      if (moveDist > 0.001) {
        enemy.x += (dx / moveDist) * currentSpeed * mobDt;
        enemy.y += (dy / moveDist) * currentSpeed * mobDt;
      }
    }

    // 📌 몬스터-몬스터 유기적 겹침 방지 (밀쳐내기 물리)
    // ⚠️ MidDash 돌진 중(charging, action)인 호로는 밀쳐내기 물리 대상에서 제외하여 돌진 중 밀어냄 방지!
    for (let j = i - 1; j >= 0; j--) {
      const other = state.enemies[j];

      // 돌진 중이거나 쿨다운 중인 MidDash 호로는 폭력적인 밀쳐내기 비활성화
      const isEnemyDashing = enemy.type === 'MidDash' && (enemy.state === 'charging' || enemy.state === 'action' || enemy.state === 'cooldown');
      const isOtherDashing = other.type === 'MidDash' && (other.state === 'charging' || other.state === 'action' || other.state === 'cooldown');

      if (isEnemyDashing || isOtherDashing) continue;

      const mdx = enemy.x - other.x;
      const mdy = enemy.y - other.y;
      const mdist = Math.hypot(mdx, mdy);
      const minDist = enemy.radius + other.radius;

      if (mdist < minDist && mdist > 0) {
        const overlap = (minDist - mdist) * 0.35;
        const pushX = (mdx / mdist) * overlap;
        const pushY = (mdy / mdist) * overlap;

        enemy.x += pushX;
        enemy.y += pushY;
        other.x -= pushX;
        other.y -= pushY;
      }
    }

    // 📌 넉백 물리 감쇄
    if (enemy.kbVx || enemy.kbVy) {
      enemy.x += (enemy.kbVx || 0) * mobDt;
      enemy.y += (enemy.kbVy || 0) * mobDt;
      enemy.kbVx = (enemy.kbVx || 0) * 0.72;
      enemy.kbVy = (enemy.kbVy || 0) * 0.72;

      if (Math.hypot(enemy.kbVx, enemy.kbVy) < 4) {
        enemy.kbVx = 0;
        enemy.kbVy = 0;
      }
    }

    // 📌 1620x1290 경기장 바운더리 클램핑
    const halfW = state.arena.width / 2 - enemy.radius;
    const halfH = state.arena.height / 2 - enemy.radius;
    enemy.x = Math.max(-halfW, Math.min(halfW, enemy.x));
    enemy.y = Math.max(-halfH, Math.min(halfH, enemy.y));

    // 몸통 접촉 피격 및 플레이어 밀쳐내기 판정
    let isTouchHit = false;
    if (enemy.spawnGrace <= 0) {
      if (distToRealP < p.radius + enemy.radius && distToRealP > 0) {
        // 플레이어-호로 밀쳐내기 충돌 물리
        const pushDist = (p.radius + enemy.radius - distToRealP);
        enemy.x += (enemy.x - p.x) / distToRealP * pushDist * 0.5;
        enemy.y += (enemy.y - p.y) / distToRealP * pushDist * 0.5;

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
  onGameOver: () => void,
  targetX?: number,
  targetY?: number
) {
  if (!enemy.state) enemy.state = 'chase';
  if (!enemy.stateTimer) enemy.stateTimer = 1.5;

  const aimX = targetX !== undefined ? targetX : p.x;
  const aimY = targetY !== undefined ? targetY : p.y;

  if (enemy.state === 'chase') {
    // 플레이어 또는 예측 길목 추적
    const dx = aimX - enemy.x;
    const dy = aimY - enemy.y;
    const distToAim = Math.hypot(dx, dy);
    const distToRealP = Math.hypot(p.x - enemy.x, p.y - enemy.y);

    if (distToAim > 0.001) {
      enemy.x += (dx / distToAim) * enemy.speed * mobDt;
      enemy.y += (dy / distToAim) * enemy.speed * mobDt;
    }

    enemy.stateTimer -= mobDt;

    // 📌 공격 전 뭉침 체크: 다른 MidDash 호로와 90px 이내로 뭉쳐있다면 공격 금지 -> 재배치 단계(relocating) 진입!
    let isStacked = false;
    for (const other of state.enemies) {
      if (other.id !== enemy.id && other.type === 'MidDash') {
        if (Math.hypot(enemy.x - other.x, enemy.y - other.y) < 90) {
          isStacked = true;
          break;
        }
      }
    }

    if (isStacked) {
      // 뭉쳐있다면 공격을 즉시 보류하고 적당한 빈 공간으로 우선 재배치!
      enemy.state = 'relocating';
      enemy.stateTimer = 1.0;
    } else if (enemy.stateTimer <= 0 && distToRealP <= 380) {
      // 뭉치지 않고 전열이 정돈된 상태에서만 차징 사출 시작!
      enemy.state = 'charging';
      enemy.stateTimer = 2.0;
      enemy.telegraphProgress = 0;
      enemy.lockedWorldX = enemy.x;
      enemy.lockedWorldY = enemy.y;
      enemy.lockedAngle = Math.atan2(aimY - enemy.y, aimX - enemy.x);
    } else if (enemy.stateTimer <= 0) {
      enemy.stateTimer = 0.25;
    }
  } else if (enemy.state === 'relocating') {
    // 📌 뭉침 해제 전술 재배치 단계: 절대 공격 불가 & 주변 빈 공간으로 확산 분산 이동!
    enemy.stateTimer -= mobDt;

    let repulseX = 0;
    let repulseY = 0;

    for (const other of state.enemies) {
      if (other.id !== enemy.id && other.type === 'MidDash') {
        const odx = enemy.x - other.x;
        const ody = enemy.y - other.y;
        const odist = Math.hypot(odx, ody);
        if (odist < 120 && odist > 0) {
          repulseX += (odx / odist);
          repulseY += (ody / odist);
        }
      }
    }

    const normRep = Math.hypot(repulseX, repulseY);
    if (normRep > 0.001) {
      enemy.x += (repulseX / normRep) * enemy.speed * 1.1 * mobDt;
      enemy.y += (repulseY / normRep) * enemy.speed * 1.1 * mobDt;
    } else {
      // 플레이어 주변 펼침 각도로 분산 이동
      const pAngle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
      enemy.x += Math.cos(pAngle) * enemy.speed * mobDt;
      enemy.y += Math.sin(pAngle) * enemy.speed * mobDt;
    }

    // 충분히 떨어졌거나 타이머 만료 시 chase 재진입
    if (enemy.stateTimer <= 0) {
      enemy.state = 'chase';
      enemy.stateTimer = 0.5;
    }
  } else if (enemy.state === 'charging') {
    enemy.stateTimer -= mobDt;
    enemy.telegraphProgress = 1 - (enemy.stateTimer / 2.0);

    // 0% ~ 70% 차징 동안 조준선이 조준 지점을 향해 부드럽게 실시간 조준 (관성 보간 적용)
    if (enemy.telegraphProgress < 0.7) {
      enemy.lockedWorldX = enemy.x;
      enemy.lockedWorldY = enemy.y;
      const desiredAngle = Math.atan2(aimY - enemy.y, aimX - enemy.x);
      if (enemy.lockedAngle === undefined) {
        enemy.lockedAngle = desiredAngle;
      } else {
        enemy.lockedAngle = lerpAngle(enemy.lockedAngle, desiredAngle, 4.5 * mobDt);
      }
    }

    if (enemy.stateTimer <= 0) {
      const actAngle = enemy.lockedAngle !== undefined ? enemy.lockedAngle : Math.atan2(aimY - enemy.y, aimX - enemy.x);
      enemy.state = 'action';
      enemy.stateTimer = 0.42; // 0.42초 630px 초고속 일직선 번개 돌격!
      enemy.actionVx = Math.cos(actAngle) * 1400;
      enemy.actionVy = Math.sin(actAngle) * 1400;
      enemy.actionProgress = 0;
    }
  } else if (enemy.state === 'action') {
    enemy.stateTimer -= mobDt;
    enemy.actionProgress = 1 - (enemy.stateTimer / 0.42);

    // 📌 Line: 630px 초고속 1400px/s 직선 번개 돌격 (몸체 물리 충돌 피격)
    enemy.x += (enemy.actionVx || 0) * mobDt;
    enemy.y += (enemy.actionVy || 0) * mobDt;

    const distToP = Math.hypot(p.x - enemy.x, p.y - enemy.y);
    if (distToP < p.radius + enemy.radius) {
      takeDamage(enemy.damage, onGameOver);
    }

    if (enemy.stateTimer <= 0) {
      enemy.state = 'cooldown';
      enemy.stateTimer = 1.0;
      enemy.lockedAngle = undefined; // 📌 돌진 완료 후 lockedAngle 해제하여 즉시 다시 플레이어를 고개 돌려 바라보게 함!
      enemy.lockedWorldX = undefined;
      enemy.lockedWorldY = undefined;
    }
  } else if (enemy.state === 'cooldown') {
    enemy.stateTimer -= mobDt;

    // 📌 돌진 완료 후 서로 인접한 경우, 물리적으로 밀쳐내지 않고 적당한 빈 공간으로 유기적 이동 재배치!
    for (const other of state.enemies) {
      if (other.id !== enemy.id && other.type === 'MidDash') {
        const odx = enemy.x - other.x;
        const ody = enemy.y - other.y;
        const odist = Math.hypot(odx, ody);
        if (odist < 55 && odist > 0) {
          // 밀쳐내기 반동 대신 인접 적당한 빈 공간으로 부드럽게 재배치 이동 (Glide to adjacent spot)
          const offsetAngle = Math.atan2(ody, odx);
          enemy.x += Math.cos(offsetAngle) * 45 * mobDt;
          enemy.y += Math.sin(offsetAngle) * 45 * mobDt;
        }
      }
    }

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
