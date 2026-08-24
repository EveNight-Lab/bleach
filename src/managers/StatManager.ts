/**
 * 블리치 사신 서바이벌 - 스탯 수련 카드 매니저
 * 카드의 각 선택지마다 부모 스탯 1개 + 동일 계열 세부 스탯 2개 내열 시스템
 */

import { state } from '../core/GameState';
import { CardOption, Stats, SubStats, SubStatEffect } from '../types/game';
import { Synth } from '../core/AudioManager';

export function checkExpLevelUp(onTriggerModal: () => void) {
  if (state.isPaused) return; // 이미 모달이 떠있거나 일시정지 상태면 중복 발동 방지!

  if (state.exp >= state.maxExp) {
    state.exp -= state.maxExp;
    state.level += 1;
    state.maxExp = Math.floor(50 * Math.pow(1.22, state.level - 1));

    state.isPaused = true;
    Synth.playLevelUpSound();
    onTriggerModal();
  }
}

interface BaseSubDef {
  key: keyof SubStats;
  label: string;
  baseVal: number;
  isPercent: boolean;
  unit: string;
  weight: number; // 가중치 (일반 100%, 희귀 40%, 울트라레어 10%)
}

const SUB_POOLS: Record<keyof Stats, BaseSubDef[]> = {
  cham: [
    { key: 'bonusAtkDmg', label: '참격 피해량', baseVal: 4, isPercent: false, unit: '', weight: 100 },
    { key: 'atkSpeedBonus', label: '공격 속도', baseVal: 0.015, isPercent: true, unit: '%', weight: 80 },
    { key: 'atkSizeBonus', label: '검기 범위 크기', baseVal: 0.02, isPercent: true, unit: '%', weight: 80 },
    { key: 'critRate', label: '치명타 확률', baseVal: 0.01, isPercent: true, unit: '%', weight: 70 },
    { key: 'knockbackForce', label: '넉백 파워', baseVal: 0.04, isPercent: true, unit: '%', weight: 70 },
    { key: 'extraAtkCount', label: '참격 사출 횟수', baseVal: 1, isPercent: false, unit: '발', weight: 5 }
  ],
  gwon: [
    { key: 'hpRegen5s', label: '5초당 체력 회복', baseVal: 0.5, isPercent: false, unit: '', weight: 60 },
    { key: 'damageRed', label: '피격 피해 감쇄', baseVal: 0.01, isPercent: true, unit: '%', weight: 90 },
    { key: 'invincDuration', label: '피격 무적 시간', baseVal: 0.05, isPercent: false, unit: '초', weight: 80 },
    { key: 'bodyReflectKb', label: '체술 넉백 방어', baseVal: 0.03, isPercent: true, unit: '%', weight: 80 },
    { key: 'retaliationPulse', label: '피격시 반격 충격파', baseVal: 1, isPercent: false, unit: '', weight: 5 }
  ],
  ju: [
    { key: 'bonusMoveSpeed', label: '보법 이동 속도', baseVal: 0.015, isPercent: true, unit: '%', weight: 100 },
    { key: 'shunpoCdRed', label: '순보 쿨타임 단축', baseVal: 0.015, isPercent: true, unit: '%', weight: 80 },
    { key: 'shunpoInvinc', label: '순보 무적 연장', baseVal: 0.05, isPercent: false, unit: '초', weight: 70 },
    { key: 'shunpoDmg', label: '순보 충격파 대미지', baseVal: 4, isPercent: false, unit: '', weight: 40 },
    { key: 'shunpoHeal', label: '순보 체력 회복', baseVal: 0.5, isPercent: false, unit: '', weight: 5 }
  ],
  gwi: [
    { key: 'auraRadius', label: '영압 오라 범위', baseVal: 5, isPercent: false, unit: 'px', weight: 90 },
    { key: 'auraDmgSec', label: '영압 오라 지속 대미지', baseVal: 1.5, isPercent: false, unit: '/초', weight: 80 },
    { key: 'magnetRadius', label: '결정 흡수 범위', baseVal: 10, isPercent: false, unit: 'px', weight: 90 },
    { key: 'reatsuSplashDmg', label: '영압 피격 충격파', baseVal: 3, isPercent: false, unit: '', weight: 70 },
    { key: 'kidoOverloadAura', label: '처치시 오라 폭주', baseVal: 1, isPercent: false, unit: '', weight: 5 }
  ]
};

function rollWeightedSubDef(pool: BaseSubDef[]): BaseSubDef {
  const totalWeight = pool.reduce((sum, def) => sum + def.weight, 0);
  let rnd = Math.random() * totalWeight;
  for (const def of pool) {
    if (rnd < def.weight) return def;
    rnd -= def.weight;
  }
  return pool[0];
}

const PARENT_CONFIGS: Record<keyof Stats, { name: string; icon: string; color: string }> = {
  cham: { name: '참', icon: '⚔️', color: 'text-red-400 border-red-500/40 bg-red-950/20' },
  gwon: { name: '권', icon: '👊', color: 'text-amber-400 border-amber-500/40 bg-amber-950/20' },
  ju: { name: '주', icon: '⚡', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20' },
  gwi: { name: '귀', icon: '🔮', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20' }
};

export function generateCardOptions(): CardOption[] {
  const options: CardOption[] = [];
  const statKeys: (keyof Stats)[] = ['cham', 'gwon', 'ju', 'gwi'];

  for (let i = 0; i < 3; i++) {
    // 부모 스탯 무작위 롤링 (동일 스탯 등판 허용!)
    const parentKey = statKeys[Math.floor(Math.random() * statKeys.length)];
    const parentConf = PARENT_CONFIGS[parentKey];

    // 가챠 등급 롤링 (Normal 65%, Rare 22%, Epic 10%, Legendary 3%)
    const randTier = Math.random();
    let tier: 'Normal' | 'Rare' | 'Epic' | 'Legendary' = 'Normal';
    let multiplier = 1.0;
    let statPtAdd = 1;

    if (randTier < 0.03) {
      tier = 'Legendary';
      multiplier = 1.8;
      statPtAdd = 2; // 전설 서지!
    } else if (randTier < 0.13) {
      tier = 'Epic';
      multiplier = 1.4;
    } else if (randTier < 0.35) {
      tier = 'Rare';
      multiplier = 1.2;
    } else {
      tier = 'Normal';
      multiplier = 1.0;
    }

    // 가중치 확률 롤링 기반 2개 세부 스탯 획득!
    const pool = SUB_POOLS[parentKey];
    const subDef1 = rollWeightedSubDef(pool);
    const subDef2 = rollWeightedSubDef(pool);

    const isJackpot = subDef1.key === subDef2.key;
    const finalMult = isJackpot ? multiplier * 2.0 : multiplier;

    const calcVal = (def: BaseSubDef) => {
      const raw = def.baseVal * finalMult;
      if (def.isPercent) {
        // 📌 0.5% 단위 완벽 정형화 (1.5%, 2.0%, 2.5%, 3.0% 등)
        const pctRaw = raw * 100;
        const pctClean = Math.round(pctRaw * 2) / 2;
        return pctClean / 100;
      }
      // 📌 횟수/개수형 스탯(extraAtkCount 등)은 무조건 정수(+1발, +2발) 보장!
      if (def.key === 'extraAtkCount' || def.key === 'retaliationPulse' || def.key === 'kidoOverloadAura') {
        return Math.max(1, Math.round(raw));
      }
      // 시간/치유형 수치는 0.5 / 0.1 단위 정형화
      if (def.unit === '초' || def.unit === 's') {
        return Math.round(raw * 10) / 10;
      }
      return def.baseVal < 1 ? Math.round(raw * 2) / 2 : Math.round(raw);
    };

    const val1 = calcVal(subDef1);
    const val2 = calcVal(subDef2);

    const formatTxt = (def: BaseSubDef, val: number) => {
      if (def.isPercent) {
        const pct = Math.round(val * 200) / 2;
        return `+${pct}${def.unit}`;
      }
      return `+${val}${def.unit}`;
    };

    const txt1 = formatTxt(subDef1, val1);
    const txt2 = formatTxt(subDef2, val2);

    const subEffects: SubStatEffect[] = [
      { key: subDef1.key, label: subDef1.label, valText: txt1, addVal: val1 },
      { key: subDef2.key, label: subDef2.label, valText: txt2, addVal: val2 }
    ];

    options.push({
      id: `card_${i}_${Date.now()}`,
      parentStat: parentKey,
      parentName: parentConf.name,
      parentIcon: parentConf.icon,
      parentColor: parentConf.color,
      tier,
      statPtAdd,
      isJackpot,
      subStats: subEffects
    });
  }

  return options;
}

export function applyCardSelection(card: CardOption, onTriggerModal?: () => void) {
  // 1. 부모 스탯 포인트 증가
  state.stats[card.parentStat] += card.statPtAdd;

  // 2. 2개 세부 서브스탯 수치 가산
  for (const eff of card.subStats) {
    if (state.subStats[eff.key] !== undefined) {
      (state.subStats[eff.key] as number) += eff.addVal;
    }
  }

  // 3. 체력 증가 또는 특수 능력 보정
  if (card.parentStat === 'gwon') {
    const hpGain = 20 * card.statPtAdd;
    state.player.maxHp += hpGain;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + hpGain);
  }

  // 4. 연속 레벨업 남아있는 경우 다음 모달 연동, 아니면 언파즈 및 안전 재진입 램프업 처리!
  if (state.exp >= state.maxExp && onTriggerModal) {
    state.isPaused = true;
    onTriggerModal();
  } else {
    state.isPaused = false;
    state.player.invincibleTimer = Math.max(state.player.invincibleTimer, 0.5); // 📌 선택 직후 0.5초 피격 무적 부여!
    state.resumeRampTimer = 0.8; // 📌 0.8초 동안 부드럽게 정상 속도로 회복하는 슬로우 모션 램프업!
  }
}
