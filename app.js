/**
 * Bleach Shinigami Survival - Phase 1 Engine & UI
 * 모바일 웹 최적화 HTML5 Canvas 2D 서바이벌 게임
 */

// --- 1. GAME CONSTANTS & STATE ---
const BASIC_ATTACKS = {
  Thrust: {
    id: 'Thrust',
    name: '찌르기 (Thrust)',
    shape: '📌 찌르기',
    icon: '🗡️',
    desc: '폭이 좁고 사거리가 긴 전방 일직선 관통 검기 사출'
  },
  Slash: {
    id: 'Slash',
    name: '베기 (Slash)',
    shape: '📌 베기',
    icon: '⚔️',
    desc: '전방 120도 부채꼴 구역을 광역으로 휩쓰는 대형 참격'
  },
  Circle: {
    id: 'Circle',
    name: '원형 (Circle)',
    shape: '📌 원형',
    icon: '🔮',
    desc: '360도 전방위로 영압 파동을 분출하여 사방의 적 타격'
  },
  Flurry: {
    id: 'Flurry',
    name: '난무 (Flurry)',
    shape: '📌 난무',
    icon: '⚡',
    desc: '매우 빠른 속도로 한 번에 3연타 다단 히트'
  }
};

const STAT_CAP = 5;

// Web Audio API Synthesizer
const Synth = {
  ctx: null,
  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn("Audio Context Init Failed", e);
      }
    }
  },
  playShunpo() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  },
  playSlash() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  },
  playHit() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  },
  playLevelUp() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
};

// --- 2. GAME STATE DATA ---
const state = {
  screen: 'title', // title, info, battle
  isPaused: false,
  isGameOver: false,
  
  // Character Roll
  assignedAttack: BASIC_ATTACKS.Thrust,
  stats: {
    cham: 0, // 참 (斬)
    gwon: 0, // 권 (拳)
    ju: 0,   // 주 (走)
    gwi: 0    // 귀 (鬼)
  },

  // In-Game Stats & Level
  level: 1,
  exp: 0,
  maxExp: 10,
  kills: 0,
  gameTime: 0, // seconds

  // Player Entity
  player: {
    x: 0,
    y: 0,
    radius: 16,
    hp: 100,
    maxHp: 100,
    speed: 3.8,
    vx: 0,
    vy: 0,
    angle: 0,
    invincibleTimer: 0,
    shunpoCooldown: 0,
    shunpoCooldownMax: 2.5, // 2.5s
    emergencyShunpoTriggered: false
  },

  // World Elements
  camera: { x: 0, y: 0 },
  enemies: [],
  expGems: [],
  particles: [],
  attacks: [],

  // Bullet Time Effect
  bulletTimeTimer: 0,
  globalTimeScale: 1.0,

  // Attack Cooldown
  attackTimer: 0,
  attackCooldown: 0.6 // sec
};

// --- 3. DOM & UI MANAGERS ---
const DOM = {
  titleScreen: document.getElementById('titleScreen'),
  characterInfoScreen: document.getElementById('characterInfoScreen'),
  gameScreen: document.getElementById('gameScreen'),
  btnGameStart: document.getElementById('btnGameStart'),
  btnStartBattle: document.getElementById('btnStartBattle'),

  // Character Info Elements
  infoAttackIcon: document.getElementById('infoAttackIcon'),
  infoAttackName: document.getElementById('infoAttackName'),
  infoAttackDesc: document.getElementById('infoAttackDesc'),
  statBarCham: document.getElementById('statBarCham'),
  statBarGwon: document.getElementById('statBarGwon'),
  statBarJu: document.getElementById('statBarJu'),
  statBarGwi: document.getElementById('statBarGwi'),
  statValCham: document.getElementById('statValCham'),
  statValGwon: document.getElementById('statValGwon'),
  statValJu: document.getElementById('statValJu'),
  statValGwi: document.getElementById('statValGwi'),
  infoStatEffectNote: document.getElementById('infoStatEffectNote'),

  // Canvas
  canvas: document.getElementById('gameCanvas'),
  ctx: document.getElementById('gameCanvas').getContext('2d'),

  // HUD
  hudHpBar: document.getElementById('hudHpBar'),
  hudHpText: document.getElementById('hudHpText'),
  hudExpBar: document.getElementById('hudExpBar'),
  hudLevelText: document.getElementById('hudLevelText'),
  badgeCham: document.getElementById('badgeCham'),
  badgeGwon: document.getElementById('badgeGwon'),
  badgeJu: document.getElementById('badgeJu'),
  badgeGwi: document.getElementById('badgeGwi'),
  hudTimer: document.getElementById('hudTimer'),
  hudKills: document.getElementById('hudKills'),

  // Controls
  joystickZone: document.getElementById('joystickZone'),
  joystickBase: document.getElementById('joystickBase'),
  joystickStick: document.getElementById('joystickStick'),
  btnShikaiAction: document.getElementById('btnShikaiAction'),
  btnShunpoAction: document.getElementById('btnShunpoAction'),

  // Modals
  levelUpModal: document.getElementById('levelUpModal'),
  cardContainer: document.getElementById('cardContainer'),
  gameOverModal: document.getElementById('gameOverModal'),
  resTime: document.getElementById('resTime'),
  resKills: document.getElementById('resKills'),
  resLevel: document.getElementById('resLevel'),
  resStats: document.getElementById('resStats'),
  btnRetry: document.getElementById('btnRetry')
};

// --- 4. CHARACTER ROLL & STAT LOGIC ---

// 1) 게임 시작 클릭 ➔ 무작위 캐릭터 생성
function rollRandomCharacter() {
  // 1. 무작위 평타 1종 뽑기
  const keys = Object.keys(BASIC_ATTACKS);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  state.assignedAttack = BASIC_ATTACKS[randomKey];

  // 2. 초기 5 스탯 포인트 무작위 분배 (참, 권, 주, 귀)
  state.stats.cham = 0;
  state.stats.gwon = 0;
  state.stats.ju = 0;
  state.stats.gwi = 0;

  const statKeys = ['cham', 'gwon', 'ju', 'gwi'];
  for (let i = 0; i < 5; i++) {
    const pickedStat = statKeys[Math.floor(Math.random() * statKeys.length)];
    state.stats[pickedStat]++;
  }

  // 3. 정보창 UI 업데이트
  updateInfoScreenUI();

  // 화면 전환
  DOM.titleScreen.classList.remove('active');
  DOM.titleScreen.classList.add('hidden');
  DOM.titleScreen.style.display = 'none';

  DOM.characterInfoScreen.classList.remove('hidden');
  DOM.characterInfoScreen.classList.add('active');
  DOM.characterInfoScreen.style.display = 'flex';
}

// 2) 정보창 UI 업데이트
function updateInfoScreenUI() {
  DOM.infoAttackIcon.textContent = state.assignedAttack.icon;
  DOM.infoAttackName.textContent = state.assignedAttack.name;
  DOM.infoAttackDesc.textContent = state.assignedAttack.desc;

  const s = state.stats;
  DOM.statBarCham.style.width = `${(s.cham / STAT_CAP) * 100}%`;
  DOM.statBarGwon.style.width = `${(s.gwon / STAT_CAP) * 100}%`;
  DOM.statBarJu.style.width = `${(s.ju / STAT_CAP) * 100}%`;
  DOM.statBarGwi.style.width = `${(s.gwi / STAT_CAP) * 100}%`;

  DOM.statValCham.textContent = `${s.cham} / ${STAT_CAP}`;
  DOM.statValGwon.textContent = `${s.gwon} / ${STAT_CAP}`;
  DOM.statValJu.textContent = `${s.ju} / ${STAT_CAP}`;
  DOM.statValGwi.textContent = `${s.gwi} / ${STAT_CAP}`;

  // 활성화된 패시브 효과 문구 생성
  const activeNotes = [];
  if (s.cham >= 5) activeNotes.push("참 5pt: 타격 범위 2배 + [흡혈]");
  if (s.gwon >= 5) activeNotes.push("권 5pt: 넉백 저항 + [위기탈출 자동순보]");
  if (s.ju >= 5) activeNotes.push("주 5pt: 이동 가속 + [영자집속 SP회복]");
  if (s.gwi >= 5) activeNotes.push("귀 5pt: 폭발범위 40%↑ + [참백도 동조 준비]");

  if (activeNotes.length === 0) {
    DOM.infoStatEffectNote.textContent = "현재 스탯 레벨 5pt 달성 시 브릿지 연계 효과가 활성화됩니다.";
  } else {
    DOM.infoStatEffectNote.textContent = "⚡ 활성 연계 효과: " + activeNotes.join(" | ");
  }
}

// --- 5. INPUT & JOYSTICK CONTROLLER ---
const input = {
  moveX: 0,
  moveY: 0,
  keys: {},
  touchActive: false,
  touchStartX: 0,
  touchStartY: 0
};

// Keyboard Listeners (WASD + Space)
window.addEventListener('keydown', (e) => {
  input.keys[e.code] = true;
  if (e.code === 'Space') {
    e.preventDefault();
    triggerShunpo();
  }
});
window.addEventListener('keyup', (e) => {
  input.keys[e.code] = false;
});

// Mobile Touch Joystick
DOM.joystickZone.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  input.touchActive = true;
  input.touchStartX = touch.clientX;
  input.touchStartY = touch.clientY;

  DOM.joystickBase.style.left = `${touch.clientX}px`;
  DOM.joystickBase.style.top = `${touch.clientY}px`;
  DOM.joystickBase.classList.remove('hidden');
  updateJoystick(touch.clientX, touch.clientY);
}, { passive: false });

DOM.joystickZone.addEventListener('touchmove', (e) => {
  if (!input.touchActive) return;
  const touch = e.touches[0];
  updateJoystick(touch.clientX, touch.clientY);
}, { passive: false });

const resetJoystick = () => {
  input.touchActive = false;
  input.moveX = 0;
  input.moveY = 0;
  DOM.joystickBase.classList.add('hidden');
  DOM.joystickStick.style.transform = `translate(-50%, -50%)`;
};

DOM.joystickZone.addEventListener('touchend', resetJoystick);
DOM.joystickZone.addEventListener('touchcancel', resetJoystick);

function updateJoystick(clientX, clientY) {
  const dx = clientX - input.touchStartX;
  const dy = clientY - input.touchStartY;
  const dist = Math.hypot(dx, dy);
  const maxRadius = 50;

  const angle = Math.atan2(dy, dx);
  const clampedDist = Math.min(dist, maxRadius);

  const stickX = Math.cos(angle) * clampedDist;
  const stickY = Math.sin(angle) * clampedDist;

  DOM.joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

  input.moveX = Math.cos(angle) * (clampedDist / maxRadius);
  input.moveY = Math.sin(angle) * (clampedDist / maxRadius);
}

// Action Button Listeners
DOM.btnShunpoAction.addEventListener('touchstart', (e) => {
  e.preventDefault();
  triggerShunpo();
});
DOM.btnShunpoAction.addEventListener('click', () => {
  triggerShunpo();
});

// 순보 (Shunpo Flash Step) 무적 대시 & 불릿타임
function triggerShunpo() {
  if (state.player.shunpoCooldown > 0 || state.isGameOver || state.isPaused) return;

  // 1. 사운드 재생
  Synth.playShunpo();

  // 2. 무적 & 이동속도 대폭 증가
  state.player.invincibleTimer = 0.4; // 0.4s 무적
  state.player.shunpoCooldown = state.player.shunpoCooldownMax * (state.stats.ju >= 5 ? 0.7 : 1.0);

  // 진행 방향 계산 (없으면 바라보는 방향)
  let dashAngle = state.player.angle;
  if (input.moveX !== 0 || input.moveY !== 0) {
    dashAngle = Math.atan2(input.moveY, input.moveX);
  }

  // 3. 순간 질주 (대시)
  const dashSpeed = 16.0;
  state.player.x += Math.cos(dashAngle) * dashSpeed * 8;
  state.player.y += Math.sin(dashAngle) * dashSpeed * 8;

  // 4. 순보 잔상 파티클 생성
  for (let i = 0; i < 6; i++) {
    state.particles.push({
      x: state.player.x - Math.cos(dashAngle) * (i * 12),
      y: state.player.y - Math.sin(dashAngle) * (i * 12),
      radius: state.player.radius * (1 - i * 0.1),
      color: '#00e5ff',
      alpha: 0.8,
      life: 0.3
    });
  }

  // 5. 0.3초간 전장 불릿타임 (시간 완속 연출)
  state.bulletTimeTimer = 0.35;
  state.globalTimeScale = 0.2; // 적/파티클 80% 느려짐!
}

// --- 6. CANVAS BATTLE ENGINE ---

function initBattle() {
  // Resize Canvas to Viewport
  DOM.canvas.width = window.innerWidth;
  DOM.canvas.height = window.innerHeight;

  // Reset Game Data & Modals
  state.isGameOver = false;
  state.isPaused = false;
  state.level = 1;
  state.exp = 0;
  state.maxExp = 10;
  state.kills = 0;
  state.gameTime = 0;
  
  DOM.gameOverModal.classList.add('hidden');
  DOM.gameOverModal.style.display = 'none';
  DOM.levelUpModal.classList.add('hidden');
  DOM.levelUpModal.style.display = 'none';

  // Calculate Base Player HP from 권 Stat
  const baseHp = 100 + (state.stats.gwon * 20);
  state.player.maxHp = baseHp;
  state.player.hp = baseHp;
  state.player.x = 0;
  state.player.y = 0;
  state.player.invincibleTimer = 1.5; // 1.5초 스폰 무적 시간 부여

  state.enemies = [];
  state.expGems = [];
  state.particles = [];
  state.attacks = [];

  // 소수 정예 엘리트 호로 3마리 초기 스폰 (높은 체력, 묵직한 공격력, 고속 추적)
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const dist = 360 + Math.random() * 40;
    state.enemies.push({
      id: Math.random(),
      x: state.player.x + Math.cos(angle) * dist,
      y: state.player.y + Math.sin(angle) * dist,
      radius: 18,
      hp: 180,
      maxHp: 180,
      speed: 210 + Math.random() * 40 // 초당 210~250px 고속 추적
    });
  }

  // HUD Update
  updateHUD();

  // Screen Switch
  DOM.characterInfoScreen.classList.remove('active');
  DOM.characterInfoScreen.classList.add('hidden');
  DOM.characterInfoScreen.style.display = 'none';

  DOM.gameScreen.classList.remove('hidden');
  DOM.gameScreen.classList.add('active');
  DOM.gameScreen.style.display = 'block';

  // Start Loop
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

let lastTime = 0;

function gameLoop(now) {
  if (state.screen !== 'battle') return;

  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (!state.isPaused && !state.isGameOver) {
    update(dt);
  }

  render();

  requestAnimationFrame(gameLoop);
}

// --- 7. UPDATE LOGIC ---

function update(dt) {
  // 1. 타이머 & 불릿 타임 업데이트
  state.gameTime += dt;
  if (state.bulletTimeTimer > 0) {
    state.bulletTimeTimer -= dt;
    if (state.bulletTimeTimer <= 0) {
      state.globalTimeScale = 1.0;
    }
  }

  // 2. 쿨타임 관리
  if (state.player.invincibleTimer > 0) state.player.invincibleTimer -= dt;
  if (state.player.shunpoCooldown > 0) state.player.shunpoCooldown -= dt;

  // 3. 키보드 입력 병합
  let dirX = input.moveX;
  let dirY = input.moveY;

  if (input.keys['KeyW'] || input.keys['ArrowUp']) dirY = -1;
  if (input.keys['KeyS'] || input.keys['ArrowDown']) dirY = 1;
  if (input.keys['KeyA'] || input.keys['ArrowLeft']) dirX = -1;
  if (input.keys['KeyD'] || input.keys['ArrowRight']) dirX = 1;

  // 이동속도 계산 (주 스탯 보정, 초당 240px 베이스)
  let speed = (240 + state.stats.ju * 25) * dt;
  if (dirX !== 0 && dirY !== 0) {
    dirX *= 0.7071;
    dirY *= 0.7071;
  }

  state.player.x += dirX * speed;
  state.player.y += dirY * speed;

  if (dirX !== 0 || dirY !== 0) {
    state.player.angle = Math.atan2(dirY, dirX);
    // 주 5pt: 이동 중 영자/마나 충전 효과
    if (state.stats.ju >= 5) {
      state.exp += dt * 0.5; // 소량 경험치 자동 차징
      checkExpLevelUp();
    }
  }

  // 카메라 플레이어 추적
  state.camera.x = state.player.x - DOM.canvas.width / 2;
  state.camera.y = state.player.y - DOM.canvas.height / 2;

  // 4. 자동 평타 사출 (0.35초 주기 쾌속 평타)
  state.attackTimer += dt;
  const currentAttackCd = 0.35 * (1 - state.stats.cham * 0.05);
  if (state.attackTimer >= currentAttackCd) {
    state.attackTimer = 0;
    dispatchBasicAttack();
  }

  // 5. 공격 투사체/판정 업데이트
  for (let i = state.attacks.length - 1; i >= 0; i--) {
    const atk = state.attacks[i];
    atk.life -= dt;
    atk.x += atk.vx * dt;
    atk.y += atk.vy * dt;

    if (atk.life <= 0) {
      state.attacks.splice(i, 1);
    }
  }

  // 6. 적 호로 스폰 & 이동
  spawnEnemies(dt);

  const mobDt = dt * state.globalTimeScale;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    
    // 플레이어를 향해 이동
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      enemy.x += (dx / dist) * enemy.speed * mobDt;
      enemy.y += (dy / dist) * enemy.speed * mobDt;
    }

    // 공격 판정 및 충돌 검사
    for (let j = state.attacks.length - 1; j >= 0; j--) {
      const atk = state.attacks[j];
      const hitDist = Math.hypot(enemy.x - atk.x, enemy.y - atk.y);
      const hitRadius = enemy.radius + atk.radius * (state.stats.cham >= 5 ? 2.0 : 1.0);

      // 동일 투사체 중복 피격 방지 & 1회성 정밀 타격
      if (hitDist < hitRadius && atk.hitEnemies && !atk.hitEnemies.has(enemy.id)) {
        atk.hitEnemies.add(enemy.id);

        // 적 데미지 및 미세 넉백 (6px)
        const baseDmg = 25 + (state.stats.cham * 10);
        enemy.hp -= baseDmg;
        enemy.x += Math.cos(atk.angle) * 6;
        enemy.y += Math.sin(atk.angle) * 6;

        Synth.playHit();

        // 참 5pt 연계: [흡혈]
        if (state.stats.cham >= 5 && state.player.hp < state.player.maxHp) {
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2);
          updateHUD();
        }

        // 피격 파티클
        createHitParticles(enemy.x, enemy.y, '#ef4444');

        if (enemy.hp <= 0) {
          // 적 처치!
          state.kills++;
          // EXP Gem 드롭 (엘리트 호로 처치 시 경험치 폭탄)
          state.expGems.push({
            x: enemy.x,
            y: enemy.y,
            val: 12
          });
          state.enemies.splice(i, 1);
          break;
        }
      }
    }

    // 플레이어 충돌 검사
    if (dist < state.player.radius + enemy.radius && state.player.invincibleTimer <= 0) {
      // 권 10pt (금강 신체 슈퍼아머 및 피해 감쇄)
      const rawDmg = 25; // 묵직하고 강한 적 피격 데미지
      const finalDmg = Math.max(5, rawDmg - (state.stats.gwon * 3));
      state.player.hp -= finalDmg;
      state.player.invincibleTimer = 0.6;

      // 권 15pt 위기 탈출 자동 순보
      if (state.stats.gwon >= 5 && (state.player.hp / state.player.maxHp) <= 0.15 && !state.player.emergencyShunpoTriggered) {
        state.player.emergencyShunpoTriggered = true;
        triggerShunpo();
      }

      updateHUD();

      if (state.player.hp <= 0) {
        triggerGameOver();
      }
    }
  }

  // 7. EXP Gem 자석 수집
  for (let i = state.expGems.length - 1; i >= 0; i--) {
    const gem = state.expGems[i];
    const dx = state.player.x - gem.x;
    const dy = state.player.y - gem.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 140) {
      gem.x += (dx / dist) * 9;
      gem.y += (dy / dist) * 9;
    }

    if (dist < state.player.radius + 10) {
      state.exp += gem.val;
      state.expGems.splice(i, 1);
      checkExpLevelUp();
    }
  }

  // 8. 파티클 수명 관리
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  updateHUD();
}

// --- 8. BASIC ATTACK DISPATCH ---

function dispatchBasicAttack() {
  const type = state.assignedAttack.id;
  const p = state.player;

  // 🎯 가장 인접한 적 자동 탐색 (Auto-Targeting)
  let targetAngle = p.angle;
  let nearestDist = Infinity;
  let nearestEnemy = null;

  for (const enemy of state.enemies) {
    const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    if (dist < nearestDist && dist < 650) {
      nearestDist = dist;
      nearestEnemy = enemy;
    }
  }

  if (nearestEnemy) {
    targetAngle = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
    p.angle = targetAngle; // 플레이어 바라보는 방향도 적 방향으로 동기화!
  }

  const angle = targetAngle;
  Synth.playSlash();

  if (type === 'Thrust') {
    // 📌 찌르기: 전방 긴 일직선 관통 레이
    state.attacks.push({
      x: p.x + Math.cos(angle) * 30,
      y: p.y + Math.sin(angle) * 30,
      vx: Math.cos(angle) * 650,
      vy: Math.sin(angle) * 650,
      radius: 20,
      angle: angle,
      life: 0.35,
      type: 'Thrust',
      hitEnemies: new Set()
    });
  } else if (type === 'Slash') {
    // 📌 베기: 전방 120도 부채꼴 참격
    state.attacks.push({
      x: p.x + Math.cos(angle) * 20,
      y: p.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * 350,
      vy: Math.sin(angle) * 350,
      radius: 50,
      angle: angle,
      life: 0.25,
      type: 'Slash',
      hitEnemies: new Set()
    });
  } else if (type === 'Circle') {
    // 📌 원형: 360도 전방위 파동
    state.attacks.push({
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      radius: 75,
      angle: 0,
      life: 0.3,
      type: 'Circle',
      hitEnemies: new Set()
    });
  } else if (type === 'Flurry') {
    // 📌 난무: 고속 3연타 사출
    for (let k = 0; k < 3; k++) {
      setTimeout(() => {
        state.attacks.push({
          x: p.x + Math.cos(angle) * (15 + k * 10),
          y: p.y + Math.sin(angle) * (15 + k * 10),
          vx: Math.cos(angle) * 500,
          vy: Math.sin(angle) * 500,
          radius: 18,
          angle: angle,
          life: 0.2,
          type: 'Flurry',
          hitEnemies: new Set()
        });
      }, k * 60);
    }
  }
}

// --- 9. ENEMIES SPAWN & PARTICLES ---

function spawnEnemies(dt) {
  if (state.enemies.length >= 6) return; // 최대 6마리로 수량 엄격 제한 (소수 정예)

  if (Math.random() < 0.04) {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 380 + Math.random() * 60;
    const ex = state.player.x + Math.cos(angle) * spawnDist;
    const ey = state.player.y + Math.sin(angle) * spawnDist;

    state.enemies.push({
      id: Math.random(),
      x: ex,
      y: ey,
      radius: 18,
      hp: 180 + state.level * 30,     // 높은 체력 (6~8타 맞춰야 파괴)
      maxHp: 180 + state.level * 30,
      speed: 210 + Math.random() * 40  // 초당 210~250px 고속 추적
    });
  }
}

function createHitParticles(x, y, color) {
  for (let i = 0; i < 5; i++) {
    state.particles.push({
      x,
      y,
      radius: 3 + Math.random() * 4,
      color,
      life: 0.2
    });
  }
}

// --- 10. LEVEL UP & EXP SYSTEM ---

function checkExpLevelUp() {
  if (state.exp >= state.maxExp) {
    state.exp -= state.maxExp;
    state.level++;
    state.maxExp = Math.round(state.maxExp * 1.3);

    Synth.playLevelUp();
    triggerLevelUpModal();
  }
}

function triggerLevelUpModal() {
  state.isPaused = true;
  DOM.cardContainer.innerHTML = '';

  // 4대 스탯 중 아직 5pt 미만인 스탯 3개 추출
  const availableStats = [
    { key: 'cham', name: '참 (斬 - 검술)', icon: '⚔️', desc: '평타 대미지 & 사거리 증가 (5pt: 흡혈)' },
    { key: 'gwon', name: '권 (拳 - 체술)', icon: '👊', desc: '최대 HP & 피해 감쇄 (5pt: 위기탈출 자동순보)' },
    { key: 'ju', name: '주 (走 - 보법)', icon: '⚡', desc: '이동 속도 & 순보 쿨감 (5pt: 영자집속 회복)' },
    { key: 'gwi', name: '귀 (鬼 - 영압)', icon: '🔮', desc: '영압 폭발 범위 & 쿨감 (5pt: 참백도 동조 준비)' }
  ].filter(item => state.stats[item.key] < STAT_CAP);

  if (availableStats.length === 0) {
    // 모든 스탯 만렙 시 게임 재개
    state.isPaused = false;
    return;
  }

  // 셔플 및 최대 3개 카드 추출
  availableStats.sort(() => Math.random() - 0.5);
  const selectedOptions = availableStats.slice(0, 3);

  selectedOptions.forEach(opt => {
    const cardEl = document.createElement('div');
    cardEl.className = 'select-card';
    cardEl.innerHTML = `
      <div class="card-left">
        <span class="card-icon">${opt.icon}</span>
        <div class="card-text-box">
          <div class="card-name">${opt.name}</div>
          <div class="card-desc">${opt.desc}</div>
        </div>
      </div>
      <div class="card-pts">${state.stats[opt.key]} ➔ ${state.stats[opt.key] + 1}pt</div>
    `;

    cardEl.addEventListener('click', () => {
      state.stats[opt.key]++;
      state.isPaused = false;
      DOM.levelUpModal.classList.add('hidden');
      DOM.levelUpModal.style.display = 'none';
      updateHUD();
    });

    DOM.cardContainer.appendChild(cardEl);
  });

  DOM.levelUpModal.classList.remove('hidden');
  DOM.levelUpModal.style.display = 'flex';
}

// --- 11. HUD & RENDERER ---

function updateHUD() {
  const hpPercent = Math.max(0, (state.player.hp / state.player.maxHp) * 100);
  DOM.hudHpBar.style.width = `${hpPercent}%`;
  DOM.hudHpText.textContent = `${Math.ceil(state.player.hp)} / ${state.player.maxHp}`;

  const expPercent = Math.min(100, (state.exp / state.maxExp) * 100);
  DOM.hudExpBar.style.width = `${expPercent}%`;
  DOM.hudLevelText.textContent = `Lv.${state.level}`;

  DOM.badgeCham.textContent = `참:${state.stats.cham}`;
  DOM.badgeGwon.textContent = `권:${state.stats.gwon}`;
  DOM.badgeJu.textContent = `주:${state.stats.ju}`;
  DOM.badgeGwi.textContent = `귀:${state.stats.gwi}`;

  const mins = Math.floor(state.gameTime / 60).toString().padStart(2, '0');
  const secs = Math.floor(state.gameTime % 60).toString().padStart(2, '0');
  DOM.hudTimer.textContent = `${mins}:${secs}`;
  DOM.hudKills.textContent = `💀 ${state.kills}`;
}

function render() {
  const ctx = DOM.ctx;
  const w = DOM.canvas.width;
  const h = DOM.canvas.height;
  const cam = state.camera;

  // 배경 캔버스 클리어
  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, w, h);

  // 그리드 스크롤 Background
  ctx.strokeStyle = '#181824';
  ctx.lineWidth = 1;
  const gridSize = 80;
  const offsetX = -cam.x % gridSize;
  const offsetY = -cam.y % gridSize;

  for (let x = offsetX; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = offsetY; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 1. EXP Gems 렌더링
  state.expGems.forEach(gem => {
    const rx = gem.x - cam.x;
    const ry = gem.y - cam.y;
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(rx, ry, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. 적 호로 (네모/세모) 렌더링
  state.enemies.forEach(enemy => {
    const rx = enemy.x - cam.x;
    const ry = enemy.y - cam.y;

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.rect(rx - enemy.radius, ry - enemy.radius, enemy.radius * 2, enemy.radius * 2);
    ctx.fill();

    // HP 바
    ctx.fillStyle = '#181824';
    ctx.fillRect(rx - 12, ry - enemy.radius - 8, 24, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(rx - 12, ry - enemy.radius - 8, (enemy.hp / enemy.maxHp) * 24, 4);
  });

  // 3. 공격 판정 투사체/참격 렌더링
  state.attacks.forEach(atk => {
    const rx = atk.x - cam.x;
    const ry = atk.y - cam.y;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(atk.angle);

    if (atk.type === 'Thrust') {
      // 📌 찌르기: 신월 관통 빔
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-20, -6, 60, 12);
    } else if (atk.type === 'Slash') {
      // 📌 베기: 부채꼴 참격
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, atk.radius, -Math.PI / 3, Math.PI / 3);
      ctx.lineTo(0, 0);
      ctx.fill();
    } else if (atk.type === 'Circle') {
      // 📌 원형: 360도 아우라 폭발
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, atk.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (atk.type === 'Flurry') {
      // 📌 난무: 삼연속 쾌속 검기
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-10, -4, 30, 8);
    }

    ctx.restore();
  });

  // 4. 파티클 렌더링
  state.particles.forEach(p => {
    const rx = p.x - cam.x;
    const ry = p.y - cam.y;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life * 2;
    ctx.beginPath();
    ctx.arc(rx, ry, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });

  // 5. 플레이어 렌더링 (원형 사신)
  const px = state.player.x - cam.x;
  const py = state.player.y - cam.y;

  // 무적 상태 깜빡임
  if (state.player.invincibleTimer <= 0 || Math.floor(Date.now() / 50) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, state.player.radius, 0, Math.PI * 2);
    ctx.fill();

    // 조준 방향 화살표
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(state.player.angle) * 24, py + Math.sin(state.player.angle) * 24);
    ctx.stroke();
  }
}

// --- 12. GAME OVER & RETRY ---

function triggerGameOver() {
  state.isGameOver = true;
  const mins = Math.floor(state.gameTime / 60).toString().padStart(2, '0');
  const secs = Math.floor(state.gameTime % 60).toString().padStart(2, '0');

  DOM.resTime.textContent = `${mins}:${secs}`;
  DOM.resKills.textContent = `${state.kills}`;
  DOM.resLevel.textContent = `Lv.${state.level}`;
  const s = state.stats;
  DOM.resStats.textContent = `참${s.cham} 권${s.gwon} 주${s.ju} 귀${s.gwi}`;

  DOM.gameOverModal.classList.remove('hidden');
  DOM.gameOverModal.style.display = 'flex';
}

// --- 13. GLOBAL EVENT BINDINGS ---
DOM.btnGameStart.addEventListener('click', () => {
  rollRandomCharacter();
});

DOM.btnStartBattle.addEventListener('click', () => {
  state.screen = 'battle';
  initBattle();
});

DOM.btnRetry.addEventListener('click', () => {
  DOM.gameOverModal.classList.add('hidden');
  DOM.gameOverModal.style.display = 'none';
  rollRandomCharacter();
});
