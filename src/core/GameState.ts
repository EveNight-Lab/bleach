/**
 * 블리치 사신 서바이벌 - 전역 상태 및 참백도 상수 모듈
 */

import { GameState, BasicAttackConfig } from '../types/game';

export const STAT_CAP = Infinity;

export const BASIC_ATTACKS: Record<string, BasicAttackConfig> = {
  Thrust: {
    id: 'Thrust',
    name: '찌르기 (Thrust)',
    shape: '📌 찌르기',
    icon: '🗡️',
    baseCd: 0.35,
    desc: '폭이 좁고 사거리가 긴 전방 일직선 관통 검기 사출'
  },
  Slash: {
    id: 'Slash',
    name: '베기 (Slash)',
    shape: '📌 베기',
    icon: '⚔️',
    baseCd: 0.88,
    desc: '전방으로 천천히 오랫동안 뻗어나가는 묵직한 관통 초승달 검기 파동'
  },
  Circle: {
    id: 'Circle',
    name: '원형 (Circle)',
    shape: '📌 원형',
    icon: '🔮',
    baseCd: 0.42,
    desc: '360도 전방위로 영압 파동을 분출하여 사방의 적 타격'
  },
  Flurry: {
    id: 'Flurry',
    name: '난무 (Flurry)',
    shape: '📌 난무',
    icon: '⚡',
    baseCd: 0.32,
    desc: '매우 빠른 속도로 한 번에 3연타 다단 히트'
  }
};

export const state: GameState = {
  screen: 'title',
  isPaused: false,
  isGameOver: false,

  assignedAttack: BASIC_ATTACKS.Thrust,
  stats: {
    cham: 0,
    gwon: 0,
    ju: 0,
    gwi: 0
  },
  subStats: {
    bonusAtkDmg: 0,
    atkSpeedBonus: 0,
    atkSizeBonus: 1.0,
    critRate: 0.05,
    knockbackForce: 1.0,
    extraAtkCount: 0,

    hpRegen5s: 0,
    damageRed: 0,
    invincDuration: 0.6,
    bodyReflectKb: 0,
    retaliationPulse: 0,

    bonusMoveSpeed: 0,
    shunpoCdRed: 0,
    shunpoHeal: 0,
    shunpoInvinc: 0.4,
    shunpoDmg: 0,
    extraShunpoCharge: 0,

    bulletSlowBonus: 0,
    auraRadius: 0,
    auraDmgSec: 0,
    magnetRadius: 180,
    reatsuSplashDmg: 0,
    kidoOverloadAura: 0
  },

  level: 1,
  exp: 0,
  maxExp: 50,
  kills: 0,
  gameTime: 0,

  player: {
    x: 0,
    y: 0,
    radius: 16,
    hp: 100,
    maxHp: 100,
    baseSpeed: 240,
    vx: 0,
    vy: 0,
    angle: 0,
    invincibleTimer: 0,
    shunpoCooldown: 0,
    shunpoCooldownMax: 2.0,
    emergencyShunpoTriggered: false
  },

  arena: {
    width: 1620,
    height: 1290
  },
  camera: { x: 0, y: 0 },
  enemies: [],
  enemyProjectiles: [],
  expGems: [],
  particles: [],
  attacks: [],
  floatingTexts: [],
  playerHitFlashTimer: 0,

  bulletTimeTimer: 0,
  maxBulletTimeTimer: 0.35,
  globalTimeScale: 1.0,

  attackTimer: 0,
  attackCooldown: 0.35
};

export function resetGameState() {
  state.screen = 'battle';
  state.isGameOver = false;
  state.isPaused = false;
  state.level = 1;
  state.exp = 0;
  state.maxExp = 50;
  state.kills = 0;
  state.gameTime = 0;
  state.bulletTimeTimer = 0;
  state.globalTimeScale = 1.0;

  const baseHp = 100 + (state.stats.gwon * 20);
  state.player.maxHp = baseHp;
  state.player.hp = baseHp;
  state.player.x = 0;
  state.player.y = 0;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.invincibleTimer = 1.5;
  state.player.shunpoCooldown = 0;
  state.player.dashTimer = 0;
  state.player.emergencyShunpoTriggered = false;

  state.enemies = [];
  state.enemyProjectiles = [];
  state.expGems = [];
  state.particles = [];
  state.attacks = [];
  state.floatingTexts = [];
}
