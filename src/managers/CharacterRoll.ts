/**
 * 블리치 사신 서바이벌 - 사신 무작위 추첨 매니저
 */

import { state, BASIC_ATTACKS } from '../core/GameState';

export function rollRandomCharacter() {
  // 기본 참백도 기술 4종 중 무작위 1종 배정
  const attackKeys = Object.keys(BASIC_ATTACKS);
  const randomAttackKey = attackKeys[Math.floor(Math.random() * attackKeys.length)];
  state.assignedAttack = BASIC_ATTACKS[randomAttackKey];

  // 총 스탯 포인트 8점을 참, 권, 주, 귀에 무작위 분배
  let pointsLeft = 8;
  const stats = { cham: 0, gwon: 0, ju: 0, gwi: 0 };

  const keys: (keyof typeof stats)[] = ['cham', 'gwon', 'ju', 'gwi'];
  while (pointsLeft > 0) {
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    stats[randomKey]++;
    pointsLeft--;
  }

  state.stats = stats;

  // 서브스탯 초기화
  state.subStats = {
    bonusAtkDmg: 0,
    atkSpeedBonus: 0,
    atkSizeBonus: 1.0,
    critRate: 0.05,
    knockbackForce: 1.0,

    hpRegen5s: 0,
    damageRed: 0,
    invincDuration: 0.6,
    bodyReflectKb: 0,

    bonusMoveSpeed: 0,
    shunpoCdRed: 0,
    shunpoHeal: 0,
    shunpoInvinc: 0.4,
    shunpoDmg: 0,

    bulletSlowBonus: 0,
    auraRadius: 0,
    auraDmgSec: 0,
    magnetRadius: 180,
    reatsuSplashDmg: 0
  };

  state.screen = 'info';
}
