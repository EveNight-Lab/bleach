/**
 * 블리치 사신 서바이벌 - 참백도 기본 공격 로직
 */

import { state } from '../core/GameState';
import { BasicAttack } from '../types/game';
import { Synth } from '../core/AudioManager';
import { killEnemy } from './Enemy';
import { createHitParticles, addFloatingText } from '../renderers/CanvasRenderer';

let attackIdCounter = 1;

export function dispatchBasicAttack() {
  const p = state.player;
  const sub = state.subStats;
  const attackConfig = state.assignedAttack || { id: 'Thrust' };

  // 참(斬) 스탯 및 서브스탯 기반 데미지 연산 (4배 대미지 묵직한 한 방 튜닝: 기본 56 + pt당 8대미지)
  const baseDmg = 56 + (state.stats.cham * 8);
  const bonusDmg = (sub ? sub.bonusAtkDmg || 0 : 0) * 4;
  const finalBaseDmg = baseDmg + bonusDmg;

  // 치명타 여부 계산 (기본 5% + 선택지 상승 수치)
  const critRate = 0.05 + (sub ? sub.critRate || 0 : 0);
  const isCrit = Math.random() < critRate;
  const damage = Math.floor(finalBaseDmg * (isCrit ? 1.6 : 1.0));

  // 검기 크기 보너스
  const sizeBonus = sub ? sub.atkSizeBonus || 1.0 : 1.0;

  // 📌 아무리 멀어도 가장 가까운 적을 향해 100% 무조건 정밀 조준 사출
  let nearestEnemy = null;
  let nearestDist = Infinity;
  let targetDx = Math.cos(p.angle);
  let targetDy = Math.sin(p.angle);

  for (const enemy of state.enemies) {
    const dx = enemy.x - p.x;
    const dy = enemy.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestEnemy = enemy;
      targetDx = dx;
      targetDy = dy;
    }
  }

  // 필드에 적이 아예 0마리일 때는 미사출 처리
  if (!nearestEnemy && state.enemies.length === 0) return;

  const targetAngle = Math.atan2(targetDy, targetDx);

  Synth.playSlashSound(attackConfig.id);

  // ⚔️ extraAtkCount 정수 수치 기반 추가 사출 (기본 1발 + extraAtkCount 정수발)
  const extraWaves = Math.max(0, Math.round(sub ? sub.extraAtkCount || 0 : 0));
  const totalWaves = 1 + extraWaves;
  const angleStep = 0.22; // 2갈래 이상 확산 각도

  for (let w = 0; w < totalWaves; w++) {
    // 2발 이상일 때 중앙 기준 양갈래 부채꼴 확산 각도 연산
    const spreadOffset = totalWaves > 1 ? (w - (totalWaves - 1) / 2) * angleStep : 0;
    const waveAngle = targetAngle + spreadOffset;

    if (attackConfig.id === 'Thrust') {
      // 🗡️ 찌르기: 단일/좁은 집약 직진 빠른 관통 검격
      const speed = 600;
      state.attacks.push({
        id: attackIdCounter++,
        attackType: 'Thrust',
        x: p.x,
        y: p.y,
        vx: Math.cos(waveAngle) * speed,
        vy: Math.sin(waveAngle) * speed,
        radius: 14 * sizeBonus,
        damage,
        life: 0.45,
        maxLife: 0.45,
        angle: waveAngle,
        hitEnemies: new Set(),
        isCrit
      });
    } else if (attackConfig.id === 'Slash') {
      // ⚔️ 베기 (월아천충): 묵직한 중거리 광역 참격 파동 (사거리 1.3배 상승 튜닝: life 0.65s)
      const speed = 165;
      state.attacks.push({
        id: attackIdCounter++,
        attackType: 'Slash',
        x: p.x + Math.cos(waveAngle) * 20,
        y: p.y + Math.sin(waveAngle) * 20,
        vx: Math.cos(waveAngle) * speed,
        vy: Math.sin(waveAngle) * speed,
        radius: 38 * sizeBonus,
        damage: Math.floor(damage * 0.85),
        life: 0.65,
        maxLife: 0.65,
        angle: waveAngle,
        hitEnemies: new Set(),
        isCrit
      });
    } else if (attackConfig.id === 'Circle') {
      // 🔮 원형: 발동 즉시 플레이어 위치 중심 1.5배 대형 전방위 검격 폭발
      state.attacks.push({
        id: attackIdCounter++,
        attackType: 'Circle',
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        radius: 120 * sizeBonus, // 1.5배 대형 검격 범위
        damage: Math.floor(damage * 0.95),
        life: 0.35,
        maxLife: 0.35,
        angle: 0,
        hitEnemies: new Set(),
        isCrit
      });
    } else if (attackConfig.id === 'Flurry') {
      // ⚡ 난무: 좁은 집중 타겟 초고속 3연타 다단 히트
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (state.screen !== 'battle' || state.isGameOver) return;
          const flurryAngle = waveAngle + (Math.random() - 0.5) * 0.2;
          const speed = 550;
          state.attacks.push({
            id: attackIdCounter++,
            attackType: 'Flurry',
            x: p.x,
            y: p.y,
            vx: Math.cos(flurryAngle) * speed,
            vy: Math.sin(flurryAngle) * speed,
            radius: 12 * sizeBonus,
            damage: Math.floor(damage * 0.5),
            life: 0.3,
            maxLife: 0.3,
            angle: flurryAngle,
            hitEnemies: new Set(),
            isCrit
          });
        }, i * 70);
      }
    }
  }
}

export function updateAttacks(dt: number) {
  const p = state.player;
  const sub = state.subStats;

  for (let i = state.attacks.length - 1; i >= 0; i--) {
    const atk = state.attacks[i];
    atk.life -= dt;

    if (atk.life <= 0) {
      state.attacks.splice(i, 1);
      continue;
    }

    atk.x += atk.vx * dt;
    atk.y += atk.vy * dt;

    // 적과의 피격 충돌 검사
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const enemy = state.enemies[j];
      if (atk.hitEnemies.has(enemy.id)) continue;

      const kbDx = enemy.x - atk.x;
      const kbDy = enemy.y - atk.y;
      const dist = Math.hypot(kbDx, kbDy);
      if (dist < atk.radius + enemy.radius) {
        atk.hitEnemies.add(enemy.id);

        // 데미지 입히기
        enemy.hp -= atk.damage;
        Synth.playHitSound();

        // 부드러운 유기적 물리 넉백 속도 임펄스 부여
        const kbMult = sub ? sub.knockbackForce || 1.0 : 1.0;
        const baseImpulse = atk.attackType === 'Slash' || atk.attackType === 'Thrust' ? 240 : 160;
        const impulseSpeed = baseImpulse * kbMult;
        const kbAngle = Math.atan2(kbDy, kbDx);

        enemy.kbVx = Math.cos(kbAngle) * impulseSpeed;
        enemy.kbVy = Math.sin(kbAngle) * impulseSpeed;

        // 귀(鬼) 서브스탯 전용 둔화 보너스가 있을 때만 제한적 둔화 부여
        const slowRate = sub ? sub.bulletSlowBonus || 0 : 0;
        if (slowRate > 0) {
          enemy.slowTimer = 1.0;
          enemy.slowFactor = Math.min(0.4, slowRate);
        }

        // ⚔️ 시해(始解) 각성 인과율 13대 레지스트리 효과 즉시 발동!
        if (state.shikai && state.shikai.block2) {
          const b2 = state.shikai.block2;

          // 1. Zero + Move_Speed (빙륜환 동결 속박)
          if (b2.opKey === 1 || (b2.operator === 'Zero' && b2.targetDomain === 'Move_Speed')) {
            enemy.slowTimer = 1.5;
            enemy.slowFactor = 0; // 이속 0 완전 동결!
            addFloatingText(enemy.x, enemy.y - 20, '❄️ 빙결 속박!', '#00e5ff');
          }

          // 2. Zero + Local_Time_Scale (타임 스톱)
          if (b2.opKey === 2) {
            enemy.slowTimer = 2.0;
            enemy.slowFactor = 0;
            addFloatingText(enemy.x, enemy.y - 20, '⏳ 시공간 정지!', '#f59e0b');
          }

          // 4. Invert + Move_Direction (역무 환술)
          if (b2.opKey === 4) {
            enemy.kbVx = -enemy.vx * 2.5;
            enemy.kbVy = -enemy.vy * 2.5;
            addFloatingText(enemy.x, enemy.y - 20, '🌀 역무 환술!', '#c084fc');
          }

          // 6. Link + Current_HP (바라간 체인 전이)
          if (b2.opKey === 6) {
            let chainCount = 0;
            for (const other of state.enemies) {
              if (other.id !== enemy.id && Math.hypot(other.x - enemy.x, other.y - enemy.y) < 220) {
                other.hp -= Math.floor(atk.damage * 0.7);
                createHitParticles(other.x, other.y, '#a855f7', 4);
                chainCount++;
                if (chainCount >= 20) break;
              }
            }
            if (chainCount > 0) {
              addFloatingText(enemy.x, enemy.y - 20, `🔗 체인 ${chainCount}전이!`, '#a855f7');
            }
          }

          // 8. Substitute + Current_HP (흡혈 검강)
          if (b2.opKey === 8) {
            const heal = Math.max(1, Math.floor(atk.damage * 0.20));
            p.hp = Math.min(p.maxHp, p.hp + heal);
            addFloatingText(p.x, p.y - 15, `+${heal} HP`, '#10b981');
          }
        }

        // 데미지 텍스트 및 파티클 생성
        const textClr = atk.isCrit ? '#f59e0b' : '#38bdf8';
        const txt = atk.isCrit ? `💥 ${atk.damage}` : `${atk.damage}`;
        addFloatingText(enemy.x, enemy.y - 10, txt, textClr);
        createHitParticles(enemy.x, enemy.y, textClr, 5);

        // 적 사망 처리
        if (enemy.hp <= 0) {
          killEnemy(j, createHitParticles);
        }

        // 📌 찌르기(Thrust) 및 난무(Flurry)는 단일 타겟 피격 즉시 소멸 연출! (관통 금지)
        if (atk.attackType === 'Thrust' || atk.attackType === 'Flurry') {
          state.attacks.splice(i, 1);
          break; // 즉시 탄환 제거 후 루프 탈출
        }
      }
    }
  }
}
