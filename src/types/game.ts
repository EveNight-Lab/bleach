/**
 * 블리치 사신 서바이벌 - 전역 타입 정의
 */

export type ScreenState = 'title' | 'info' | 'battle';

export interface BasicAttackConfig {
  id: string;
  name: string;
  shape: string;
  icon: string;
  baseCd: number;
  desc: string;
}

export interface Stats {
  cham: number; // 참 (斬) - 참격 공격력 및 공속, 검기 크기
  gwon: number; // 권 (拳) - 체력, 피격 무적, 체력 회복
  ju: number;   // 주 (走) - 이동 속도, 순보 쿨타임 및 무적
  gwi: number;  // 귀 (鬼) - 영압 오라, 자석 수집 및 둔화 효과
}

export interface SubStats {
  // 참 서브스탯
  bonusAtkDmg: number;
  atkSpeedBonus: number;
  atkSizeBonus: number;
  critRate: number;
  knockbackForce: number;
  extraAtkCount: number; // ⚔️ 참 10% 울트라 레어: 참격 사출 횟수 +1

  // 권 서브스탯
  hpRegen5s: number;
  damageRed: number;
  invincDuration: number;
  bodyReflectKb: number;
  retaliationPulse: number; // 👊 권 10% 울트라 레어: 피격 시 체술 반격 충격파

  // 주 서브스탯
  bonusMoveSpeed: number;
  shunpoCdRed: number;
  shunpoHeal: number; // ⚡ 주 10% 울트라 레어: 순보 순간 체력 회복
  shunpoInvinc: number;
  shunpoDmg: number;
  extraShunpoCharge: number;

  // 귀 서브스탯
  bulletSlowBonus: number;
  auraRadius: number;
  auraDmgSec: number;
  magnetRadius: number;
  reatsuSplashDmg: number;
  kidoOverloadAura: number; // 🔮 귀 10% 울트라 레어: 적 처치 시 둔화 오라 폭주
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  vx: number;
  vy: number;
  angle: number;
  invincibleTimer: number;
  shunpoCooldown: number;
  shunpoCooldownMax: number;
  emergencyShunpoTriggered: boolean;
  dashTimer?: number;
}

export interface Enemy {
  id: number;
  type: 'Melee' | 'MidDash' | 'Speed' | 'Tank' | 'Projectile';
  name: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  color: string;
  expValue: number;
  spawnGrace: number;
  
  // 돌격 패턴 및 세계 고정 좌표 (MidDash 계열)
  pattern?: 'Line' | 'Fan' | 'Diamond';
  state?: 'chase' | 'charging' | 'action' | 'cooldown';
  stateTimer?: number;
  lockedWorldX?: number;
  lockedWorldY?: number;
  lockedAngle?: number;
  targetLandingX?: number;
  targetLandingY?: number;
  actionProgress?: number;
  telegraphProgress?: number;
  actionVx?: number;
  actionVy?: number;

  ceroCooldown?: number;
  slowTimer?: number;
  slowFactor?: number;
  kbVx?: number;
  kbVy?: number;
  isPredictive?: boolean; // 🎯 40% 확률로 생성되는 길목 예측 차단 AI 호로 여부
}

export interface EnemyProjectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
}

export interface ExpGem {
  id: number;
  x: number;
  y: number;
  value: number;
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface AttackInstance {
  id: number;
  attackType: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  angle: number;
  hitEnemies: Set<number>;
  width?: number;
  height?: number;
  isCrit?: boolean;
}

export interface SubStatEffect {
  key: keyof SubStats;
  label: string;
  valText: string;
  addVal: number;
}

export interface CardOption {
  id: string;
  parentStat: keyof Stats;
  parentName: string;
  parentIcon: string;
  parentColor: string;
  tier: 'Normal' | 'Rare' | 'Epic' | 'Legendary';
  statPtAdd: number;
  isJackpot: boolean;
  subStats: SubStatEffect[];
}

export type ShikaiArchetype = 'A1_Basic' | 'A2_Burst' | 'B1_Area' | 'B2_Compact';

export interface ShikaiBlock1 {
  shape: 'Rhombus' | 'Crescent' | 'Circle';
  shapeName: string;
  count: number;
  spawnOrigin: 'Caster_To_Enemy' | 'Caster_To_Random' | 'Caster_Adjacent_Random';
  text: string;
  isMacro: boolean;
  macroType?: 'Dragon' | 'Spiral' | 'Domain';
}

export interface ShikaiBlock2 {
  opKey: number; // 1 ~ 13
  opName: string;
  text: string;
  operator: 'Zero' | 'Invert' | 'Link' | 'Substitute' | 'Amplify' | 'Add_Subtract';
  targetDomain: string;
}

export interface ShikaiPipeline {
  id: string;
  name: string;
  releaseCommand: string;
  archetype: ShikaiArchetype;
  archetypeName: string;
  block1: ShikaiBlock1;
  block2: ShikaiBlock2;
  color: string;
  icon: string;
}

export interface GameState {
  screen: ScreenState;
  isPaused: boolean;
  isGameOver: boolean;
  assignedAttack: BasicAttackConfig;
  stats: Stats;
  subStats: SubStats;
  level: number;
  exp: number;
  maxExp: number;
  kills: number;
  gameTime: number;
  player: Player;
  arena: { width: number; height: number };
  camera: { x: number; y: number };
  enemies: Enemy[];
  enemyProjectiles: EnemyProjectile[];
  expGems: ExpGem[];
  particles: Particle[];
  attacks: AttackInstance[];
  floatingTexts: FloatingText[];
  playerHitFlashTimer: number;
  bulletTimeTimer: number;
  maxBulletTimeTimer: number;
  globalTimeScale: number;
  attackTimer: number;
  attackCooldown: number;
  shikai: ShikaiPipeline | null;
  shikaiUnlocked: boolean;
}
