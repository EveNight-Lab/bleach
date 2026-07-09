/**
 * Procedural Motion Playground - Shinigami 2.5D Edition
 * 블리치 스타일 사신 전투 모션 및 2.5D 벨트스크롤 모션 시스템
 */

// --- CONFIGURATION ---
const config = {
  idleBreathSpeed: 5.5,
  idleBreathAmp: 0.9,
  walkSpeed: 15.0,
  walkStride: 7.5,
  walkStepHeight: 2.5,
  walkBounce: 0.8,
  attackDuration: 180, // ms
  attackArc: 200, // degrees
  showSkeleton: false,
  enableAudio: true,
  resolutionScale: 32 // 32, 48, 64
};

// --- DOM ELEMENTS ---
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');
const canvasOverlay = document.getElementById('canvasOverlay');

// Offscreen canvas for pixelated rendering
const offscreenCanvas = document.createElement('canvas');
const offctx = offscreenCanvas.getContext('2d');

// --- SOUND SYNTH (Web Audio API) ---
const Synth = {
  ctx: null,
  
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser", e);
    }
  },
  
  playFootstep() {
    if (!config.enableAudio) return;
    this.init();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Low friction rub sound for foot movement
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.05);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.05);
  },
  
  playShunpo() {
    if (!config.enableAudio) return;
    this.init();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // High-speed wind tear / zoom sound (Flash Step)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.12);
  },
  
  playSlash() {
    if (!config.enableAudio) return;
    this.init();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // High-pitched heavy slash wind cutting (Getsuga)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
    
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.12);
  },
  
  playHit() {
    if (!config.enableAudio) return;
    this.init();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    
    const now = this.ctx.currentTime;
    
    // Heavy metal hit + wood crack
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(300, now);
    osc1.frequency.setValueAtTime(120, now + 0.05);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.linearRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(70, now);
    osc2.frequency.exponentialRampToValueAtTime(25, now + 0.22);
    gain2.gain.setValueAtTime(0.45, now);
    gain2.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now);
    osc2.stop(now + 0.25);
  }
};

// --- INITIALIZE VIEWPORT RESOLUTION ---
let minGroundY = 0;
let maxGroundY = 0;

function updateResolution() {
  const scale = config.resolutionScale;
  offscreenCanvas.width = scale * 8;   // 32 -> 256
  offscreenCanvas.height = scale * 4.5; // 32 -> 144
  
  // Set 2.5D belt-scrolling plane range
  minGroundY = offscreenCanvas.height * 0.58;
  maxGroundY = offscreenCanvas.height * 0.90;
  
  // Clamp positions
  if (player.x > offscreenCanvas.width) player.x = offscreenCanvas.width * 0.25;
  player.y = Math.max(minGroundY, Math.min(maxGroundY, player.y));
  
  dummy.x = offscreenCanvas.width * 0.7;
  dummy.y = offscreenCanvas.height * 0.74;
}

// --- STATE MANAGEMENT ---
const player = {
  // Ground coordinates in 2.5D
  x: 60,
  y: 110,
  
  vx: 0,
  vy: 0, // Y represents depth velocity in 2.5D (depth movement)
  facingDir: 1, // 1 = right, -1 = left
  
  // Procedural animation parameters
  walkPhase: 0,
  walkWeight: 0, // 0 = idle crouch, 1 = anime run
  idleTimer: 0,
  
  // Squash/Stretch parameters (used during impact and dash)
  squashX: 1,
  squashY: 1,
  
  // Arm joint values
  frontArmHand: { x: 0, y: 0 },
  
  // Attack states
  attackState: 'ready', // 'ready', 'windup', 'swing', 'recovery'
  attackTimer: 0,       // ms
  attackStartAngle: 0,
  attackEndAngle: 0,
  attackCurrentAngle: 0,
  hasHitDummy: false,
  
  // Shunpo (Flash Step) Dash States
  shunpoCooldown: 0,   // frames
  
  // Inputs
  keys: {
    w: false, // Up in 2.5D
    s: false, // Down in 2.5D
    a: false, // Left
    d: false, // Right
    space: false // Shunpo dash trigger
  }
};

const dummy = {
  x: 180,
  y: 106, // Ground Y coordinate (Y-sorted)
  width: 7,
  height: 20,
  
  // Wobble spring physics
  angle: 0,
  angleVel: 0,
  stiffness: 0.13,
  damping: 0.84,
  flashFrames: 0
};

// Particles (Wooden splinters & Red blood-red reiatsu sparks)
let particles = [];
function spawnParticles(x, y, color, count = 10, isSplinter = false) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * (isSplinter ? 3.5 : 1.5) + (isSplinter ? player.facingDir * 1.8 : 0),
      vy: -Math.random() * (isSplinter ? 3.0 : 1.5) - 0.5,
      life: 1.0,
      decay: Math.random() * 0.05 + 0.03,
      color: color,
      size: Math.random() > 0.5 ? 1.5 : 1.0
    });
  }
}

// Getsuga Tensho Slash Trail (Black/Red energy wave)
let slashTrail = [];

// Afterimages (Shunpo Ghost Silhouette)
let afterimages = [];

// Screen shake & freezeframe
let screenshake = 0;
let hitstopFrames = 0;

// Mouse tracking
let mouseX = 0;
let mouseY = 0;
let mouseActive = false;

// --- INPUT LISTENERS ---
window.addEventListener('keydown', (e) => {
  if (canvasOverlay.classList.contains('hidden')) {
    handleKey(e.key, true);
  }
});

window.addEventListener('keyup', (e) => {
  handleKey(e.key, false);
});

function handleKey(key, isDown) {
  const k = key.toLowerCase();
  if (k === 'w') player.keys.w = isDown;
  if (k === 's') player.keys.s = isDown;
  if (k === 'a') player.keys.a = isDown;
  if (k === 'd') player.keys.d = isDown;
  
  // Space bar for Shunpo Dash
  if (k === ' ' || key === 'Spacebar') {
    if (isDown && !player.keys.space) {
      triggerShunpo();
    }
    player.keys.space = isDown;
  }
  
  if (k === 'r' && isDown) {
    // Reset target dummy positioning
    dummy.angle = 0;
    dummy.angleVel = 0;
    dummy.x = offscreenCanvas.width * 0.7;
    dummy.y = offscreenCanvas.height * 0.74;
    spawnParticles(dummy.x, dummy.y - 12, '#b45309', 15, true);
  }
}

// Map mouse to offscreen coordinate grid
gameCanvas.addEventListener('mousemove', (e) => {
  const rect = gameCanvas.getBoundingClientRect();
  const canvasX = (e.clientX - rect.left) * (gameCanvas.width / rect.width);
  const canvasY = (e.clientY - rect.top) * (gameCanvas.height / rect.height);
  
  mouseX = canvasX * (offscreenCanvas.width / gameCanvas.width);
  mouseY = canvasY * (offscreenCanvas.height / gameCanvas.height);
  mouseActive = true;
});

gameCanvas.addEventListener('mousedown', (e) => {
  if (e.button === 0 && canvasOverlay.classList.contains('hidden')) {
    triggerAttack();
  }
});

// Canvas overlay gesture activation
canvasOverlay.addEventListener('click', () => {
  canvasOverlay.classList.add('hidden');
  Synth.init();
  if (Synth.ctx) Synth.ctx.resume();
});

// Slider config bindings
function setupSliders() {
  const sliders = [
    { id: 'idleBreathSpeed', displayId: 'idleBreathSpeedVal', suffix: '', valFunc: v => parseFloat(v).toFixed(1) },
    { id: 'idleBreathAmp', displayId: 'idleBreathAmpVal', suffix: '', valFunc: v => parseFloat(v).toFixed(1) },
    { id: 'walkSpeed', displayId: 'walkSpeedVal', suffix: '', valFunc: v => parseFloat(v).toFixed(1) },
    { id: 'walkStride', displayId: 'walkStrideVal', suffix: '', valFunc: v => parseFloat(v).toFixed(1) },
    { id: 'walkStepHeight', displayId: 'walkStepHeightVal', suffix: '', valFunc: v => parseFloat(v).toFixed(1) },
    { id: 'walkBounce', displayId: 'walkBounceVal', suffix: '', valFunc: v => parseFloat(v).toFixed(1) },
    { id: 'attackDuration', displayId: 'attackDurationVal', suffix: 'ms', valFunc: v => parseInt(v) },
    { id: 'attackArc', displayId: 'attackArcVal', suffix: '°', valFunc: v => parseInt(v) }
  ];

  sliders.forEach(s => {
    const el = document.getElementById(s.id);
    const display = document.getElementById(s.displayId);
    
    el.addEventListener('input', (e) => {
      const val = e.target.value;
      config[s.id] = parseFloat(val);
      display.textContent = s.valFunc(val) + s.suffix;
    });
  });
  
  const skeletonEl = document.getElementById('showSkeleton');
  skeletonEl.addEventListener('change', (e) => {
    config.showSkeleton = e.target.checked;
  });
  
  const audioEl = document.getElementById('enableAudio');
  audioEl.addEventListener('change', (e) => {
    config.enableAudio = e.target.checked;
  });
  
  const resEl = document.getElementById('resolutionScale');
  resEl.addEventListener('change', (e) => {
    config.resolutionScale = parseInt(e.target.value);
    updateResolution();
  });
}

// --- MATH & IK SOLVER ---
function solveIK(ax, ay, cx, cy, L1, L2, dir) {
  const dx = cx - ax;
  const dy = cy - ay;
  const D = Math.sqrt(dx * dx + dy * dy);
  
  const maxD = (L1 + L2) * 0.98;
  let targetCx = cx;
  let targetCy = cy;
  let currentD = D;
  if (D > maxD) {
    const angle = Math.atan2(dy, dx);
    targetCx = ax + Math.cos(angle) * maxD;
    targetCy = ay + Math.sin(angle) * maxD;
    currentD = maxD;
  }
  
  const angleAC = Math.atan2(targetCy - ay, targetCx - ax);
  const cosAlpha = (L1 * L1 + currentD * currentD - L2 * L2) / (2 * L1 * currentD);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
  
  // Knee bends forward based on direction
  const theta1 = angleAC - dir * alpha;
  
  const bx = ax + L1 * Math.cos(theta1);
  const by = ay + L1 * Math.sin(theta1);
  
  return { bx, by, cx: targetCx, cy: targetCy };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  let difference = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + difference * t;
}

// --- SHUNPO TRIGGER ---
function triggerShunpo() {
  if (player.shunpoCooldown > 0) return;
  
  // Calculate dash direction vector based on keyboard inputs
  let ix = (player.keys.d ? 1 : 0) - (player.keys.a ? 1 : 0);
  let iy = (player.keys.s ? 1 : 0) - (player.keys.w ? 1 : 0);
  
  // If no movement keys pressed, dash forward in facing direction
  if (ix === 0 && iy === 0) {
    ix = player.facingDir;
    iy = 0;
  }
  
  // Normalize
  const length = Math.sqrt(ix * ix + iy * iy);
  const dx = ix / length;
  const dy = iy / length;
  
  const dashDist = 42; // Teleport distance
  const startX = player.x;
  const startY = player.y;
  
  let targetX = startX + dx * dashDist;
  let targetY = startY + dy * dashDist;
  
  // Boundary constraints
  targetX = Math.max(15, Math.min(offscreenCanvas.width - 15, targetX));
  targetY = Math.max(minGroundY, Math.min(maxGroundY, targetY));
  
  // Spawn 3 Shunpo Afterimages along the teleport path
  const ghostCount = 3;
  for (let i = 1; i <= ghostCount; i++) {
    const t = i / (ghostCount + 1);
    afterimages.push({
      x: lerp(startX, targetX, t),
      y: lerp(startY, targetY, t),
      facingDir: player.facingDir,
      walkPhase: player.walkPhase,
      walkWeight: player.walkWeight,
      idleTimer: player.idleTimer,
      torsoTilt: player.vx * 0.05,
      attackState: player.attackState,
      attackTimer: player.attackTimer,
      life: 1.0,
      decay: 0.12 // fast fade
    });
  }
  
  // Teleport player
  player.x = targetX;
  player.y = targetY;
  
  // Visual squash and stretch on landing
  player.squashX = 0.65;
  player.squashY = 1.35;
  
  // Spawn dust at start and end
  spawnParticles(startX, startY, '#3f3f46', 4);
  spawnParticles(targetX, targetY, '#3f3f46', 6);
  
  player.shunpoCooldown = 22; // cooldown frames (approx 360ms)
  Synth.playShunpo();
}

// --- ATTACK TRIGGER ---
function triggerAttack() {
  if (player.attackState !== 'ready') return;
  
  player.attackState = 'windup';
  player.attackTimer = 0;
  player.hasHitDummy = false;
  
  const shoulderX = player.x;
  // Account for lower crouch in combat idle: shoulder height is ~15px
  const shoulderY = player.y - 14;
  
  const angleToCursor = Math.atan2(mouseY - shoulderY, mouseX - shoulderX);
  player.attackStartAngle = angleToCursor - player.facingDir * (config.attackArc * Math.PI / 360);
  player.attackEndAngle = angleToCursor + player.facingDir * (config.attackArc * Math.PI / 360);
  player.attackCurrentAngle = player.attackStartAngle;
  
  player.facingDir = mouseX > player.x ? 1 : -1;
}

// --- GAME LOOP ---
let lastTime = 0;
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let dt = timestamp - lastTime;
  lastTime = timestamp;
  
  if (dt > 100) dt = 16.67;
  
  if (hitstopFrames > 0) {
    hitstopFrames--;
    draw();
    requestAnimationFrame(gameLoop);
    return;
  }
  
  update(dt);
  draw();
  
  requestAnimationFrame(gameLoop);
}

// --- UPDATE SCENE ---
function update(dt) {
  // 1. 2.5D MOVEMENT PHYSICS (W,A,S,D moves on ground plane)
  const accel = 0.24;
  const maxSpeed = 1.7;
  const friction = 0.80;
  
  let keyMoving = false;
  
  // Horizontal movement
  if (player.keys.a) {
    player.vx -= accel;
    if (player.attackState === 'ready') player.facingDir = -1;
    keyMoving = true;
  }
  if (player.keys.d) {
    player.vx += accel;
    if (player.attackState === 'ready') player.facingDir = 1;
    keyMoving = true;
  }
  
  // Vertical depth movement (slightly slower for perspective feel)
  if (player.keys.w) {
    player.vy -= accel * 0.75;
    keyMoving = true;
  }
  if (player.keys.s) {
    player.vy += accel * 0.75;
    keyMoving = true;
  }
  
  // Apply friction
  player.vx *= friction;
  player.vy *= friction;
  
  // Limit speed diagonally
  const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (speed > maxSpeed) {
    player.vx = (player.vx / speed) * maxSpeed;
    player.vy = (player.vy / speed) * maxSpeed;
  }
  
  player.x += player.vx;
  player.y += player.vy;
  
  // Boundary constraints (2.5D belt limits)
  if (player.x < 15) { player.x = 15; player.vx = 0; }
  if (player.x > offscreenCanvas.width - 15) { player.x = offscreenCanvas.width - 15; player.vx = 0; }
  if (player.y < minGroundY) { player.y = minGroundY; player.vy = 0; }
  if (player.y > maxGroundY) { player.y = maxGroundY; player.vy = 0; }
  
  // Squash/stretch decay
  player.squashX += (1 - player.squashX) * 0.16;
  player.squashY += (1 - player.squashY) * 0.16;
  
  // Shunpo Cooldown
  if (player.shunpoCooldown > 0) player.shunpoCooldown--;
  
  // 2. RUN/WALK ANIMATION SYNC
  const movementVelocity = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (movementVelocity > 0.05) {
    const prevPhase = player.walkPhase;
    // Walk phase updates proportional to velocity
    player.walkPhase += movementVelocity * (config.walkSpeed * 0.015);
    player.walkWeight = Math.min(1, player.walkWeight + 0.12);
    
    // Play footsteps at peak steps
    if (Math.floor(prevPhase / Math.PI) !== Math.floor(player.walkPhase / Math.PI)) {
      Synth.playFootstep();
      spawnParticles(player.x - player.facingDir * 3, player.y, '#27272a', 2);
    }
  } else {
    player.idleTimer += dt * 0.001 * config.idleBreathSpeed;
    player.walkWeight = Math.max(0, player.walkWeight - 0.16);
  }
  
  // 3. ATTACK STATE MACHINE
  const wTime = config.attackDuration * 0.22; // Windup duration
  const sTime = config.attackDuration * 0.38; // Swing duration
  const rTime = config.attackDuration * 0.40; // Recovery duration
  
  if (player.attackState !== 'ready') {
    player.attackTimer += dt;
    
    if (player.attackState === 'windup') {
      const t = Math.min(1, player.attackTimer / wTime);
      player.attackCurrentAngle = lerp(
        player.facingDir === 1 ? -Math.PI * 0.1 : -Math.PI * 0.9, 
        player.attackStartAngle, 
        t
      );
      
      if (player.attackTimer >= wTime) {
        player.attackState = 'swing';
        player.attackTimer = 0;
        Synth.playSlash();
      }
    } 
    else if (player.attackState === 'swing') {
      const t = Math.min(1, player.attackTimer / sTime);
      const ease = t * t * (3 - 2 * t);
      player.attackCurrentAngle = lerp(player.attackStartAngle, player.attackEndAngle, ease);
      
      // Hitstop and damage checks
      checkGetsugaCollision();
      
      if (player.attackTimer >= sTime) {
        player.attackState = 'recovery';
        player.attackTimer = 0;
      }
    } 
    else if (player.attackState === 'recovery') {
      const t = Math.min(1, player.attackTimer / rTime);
      // Sword returns to low combat stance
      player.attackCurrentAngle = lerpAngle(
        player.attackEndAngle, 
        player.facingDir === 1 ? Math.PI * 0.6 : Math.PI * 0.4, 
        t
      );
      
      if (player.attackTimer >= rTime) {
        player.attackState = 'ready';
        player.attackTimer = 0;
      }
    }
  }
  
  // 4. AFTERIMAGES UPDATE
  for (let i = afterimages.length - 1; i >= 0; i--) {
    const ghost = afterimages[i];
    ghost.life -= ghost.decay;
    if (ghost.life <= 0) {
      afterimages.splice(i, 1);
    }
  }
  
  // 5. TARGET DUMMY Wobble Physics
  const dummyForce = -dummy.stiffness * dummy.angle - (1 - dummy.damping) * dummy.angleVel;
  dummy.angleVel += dummyForce;
  dummy.angle += dummy.angleVel;
  
  if (dummy.flashFrames > 0) dummy.flashFrames--;
  
  // 6. PARTICLES UPDATE
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
  
  // 7. SLASH TRAIL DECAY
  if (player.attackState !== 'swing' && slashTrail.length > 0) {
    slashTrail.shift();
  }
  
  // Screenshake decay
  if (screenshake > 0) {
    screenshake *= 0.88;
    if (screenshake < 0.1) screenshake = 0;
  }
}

// --- GET KATANA STATE FOR WAIST SLASH ---
function getKatanaState(state, timer, x, y, dir, walkWeight) {
  const wTime = config.attackDuration * 0.22;
  const sTime = config.attackDuration * 0.38;
  const rTime = config.attackDuration * 0.40;
  
  const hipHeight = 8.5; 
  let hipBounceY = 0;
  if (Math.abs(player.vx) > 0.05 || Math.abs(player.vy) > 0.05) {
    hipBounceY = -Math.abs(Math.sin(player.walkPhase)) * config.walkBounce;
  } else {
    hipBounceY = Math.sin(player.idleTimer) * config.idleBreathAmp;
  }
  const hipY = y - (hipHeight + hipBounceY);
  
  let torsoTilt = dir * 0.22;
  if (walkWeight > 0.15) {
    torsoTilt = dir * 0.38 * walkWeight;
  }
  if (state === 'swing') {
    torsoTilt = dir * 0.45;
  } else if (state === 'windup') {
    torsoTilt = -dir * 0.12;
  }
  
  const torsoH = 7;
  const shoulderX = x + Math.sin(torsoTilt) * (torsoH * 0.85);
  const shoulderY = hipY - Math.cos(torsoTilt) * (torsoH * 0.85);
  const shX_front = shoulderX + dir * 1.2;
  const shY_front = shoulderY;
  
  const armL1 = 4.0;
  const armL2 = 4.0;
  
  let angleFrontArm = Math.PI * 0.5;
  if (walkWeight > 0.15) {
    angleFrontArm = dir === 1 ? -Math.PI * 0.18 + Math.cos(player.walkPhase) * 0.1 : -Math.PI * 0.82 - Math.cos(player.walkPhase) * 0.1;
  } else {
    const idleSway = Math.sin(player.idleTimer) * 0.04;
    angleFrontArm = dir === 1 ? Math.PI * 0.38 + idleSway : Math.PI * 0.62 - idleSway;
  }
  
  const defaultElX = shX_front + Math.cos(angleFrontArm) * armL1;
  const defaultElY = shY_front + Math.sin(angleFrontArm) * armL1;
  const defaultHandX = defaultElX + Math.cos(angleFrontArm - dir * 0.2) * armL2;
  const defaultHandY = defaultElY + Math.sin(angleFrontArm - dir * 0.2) * armL2;
  
  // Waist slash coordinate targets - start low-back, finish forward-up
  const hx_windup = x - dir * 4.5;
  const hy_windup = hipY + 1.0;
  const hx_finish = x + dir * 8.5;
  const hy_finish = hipY - 2.0;
  
  // Windup angle is back-down (positive PI*0.82), finish angle is forward-up (negative PI*0.08)
  const swordAngle_windup = dir === 1 ? Math.PI * 0.82 : Math.PI * 0.18;
  
  const mouseAngle = Math.atan2(mouseY - shY_front, mouseX - shX_front);
  const mouseTilt = Math.max(-0.4, Math.min(0.4, mouseAngle - (dir === 1 ? 0 : Math.PI)));
  const swordAngle_finish = (dir === 1 ? -Math.PI * 0.08 : -Math.PI * 0.92) + mouseTilt * 0.4;
  
  let handX = defaultHandX;
  let handY = defaultHandY;
  let swordAngle = 0;
  
  if (state === 'windup') {
    const t = Math.min(1, timer / wTime);
    handX = lerp(defaultHandX, hx_windup, t);
    handY = lerp(defaultHandY, hy_windup, t);
    const defaultSwordAngle = walkWeight > 0.15 ? (dir === 1 ? -Math.PI * 0.40 : -Math.PI * 0.60) : (dir === 1 ? Math.PI * 0.15 : Math.PI * 0.85);
    swordAngle = lerp(defaultSwordAngle, swordAngle_windup, t);
  } 
  else if (state === 'swing') {
    const t = Math.min(1, timer / sTime);
    const ease = t * t * (3 - 2 * t);
    handX = lerp(hx_windup, hx_finish, ease);
    handY = lerp(hy_windup, hy_finish, ease);
    // Interpolating positive to negative angle creates a sweep passing through positive angles (pointing downwards)
    swordAngle = lerp(swordAngle_windup, swordAngle_finish, ease);
  } 
  else if (state === 'recovery') {
    const t = Math.min(1, timer / rTime);
    handX = lerp(hx_finish, defaultHandX, t);
    handY = lerp(hy_finish, defaultHandY, t);
    const defaultSwordAngle = walkWeight > 0.15
      ? (dir === 1 ? -Math.PI * 0.40 : -Math.PI * 0.60)
      : (dir === 1 ? Math.PI * 0.15 : Math.PI * 0.85);
    swordAngle = lerpAngle(swordAngle_finish, defaultSwordAngle, t);
  } else {
    if (walkWeight > 0.15) {
      swordAngle = dir === 1 ? -Math.PI * 0.40 : -Math.PI * 0.60;
    } else {
      swordAngle = dir === 1 ? Math.PI * 0.15 : Math.PI * 0.85;
    }
  }
  
  return { handX, handY, swordAngle };
}

// --- Getsuga 2.5D COLLISION CHECK ---
function checkGetsugaCollision() {
  if (player.hasHitDummy) return;
  
  // 2.5D Depth Constraint: Check if they are on a similar lane/depth
  const depthThreshold = 10.0;
  if (Math.abs(player.y - dummy.y) > depthThreshold) {
    return; // Slashing past in different depth lanes
  }
  
  const kState = getKatanaState(player.attackState, player.attackTimer, player.x, player.y, player.facingDir, player.walkWeight);
  const handX = kState.handX;
  const handY = kState.handY;
  const swordAngle = kState.swordAngle;
  
  const swordLen = 17; // Long katana length
  const tipX = handX + Math.cos(swordAngle) * swordLen;
  const tipY = handY + Math.sin(swordAngle) * swordLen;
  
  const dummyPivotX = dummy.x;
  const dummyPivotY = dummy.y;
  
  const dummyHeight = dummy.height;
  const segments = 5;
  
  for (let j = 0; j <= segments; j++) {
    const factor = j / segments;
    const dy = factor * dummyHeight;
    // Pivot at bottom base of dummy
    const px = dummyPivotX - Math.sin(dummy.angle) * dy;
    const py = dummyPivotY - Math.cos(dummy.angle) * dy;
    
    const dist = distToSegment({ x: px, y: py }, { x: handX, y: handY }, { x: tipX, y: tipY });
    
    if (dist < 5.0) {
      // Hit!
      player.hasHitDummy = true;
      dummy.flashFrames = 8;
      
      const impactDir = player.facingDir;
      dummy.angleVel = impactDir * 0.16;
      
      // Spontaneous reiatsu blood-red sparks & wood splinters
      spawnParticles(px, py, '#dc2626', 10, true); // reiatsu sparks
      spawnParticles(px, py, '#854d0e', 10, true); // splinters
      spawnParticles(px, py, '#000000', 4, true);  // black ink drop splinters
      
      screenshake = 4.5;
      hitstopFrames = 6;
      Synth.playHit();
      break;
    }
  }
}

function distToSegment(p, v, w) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
}

// --- RENDER SCENE ---
function draw() {
  offctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
  
  // 1. DRAW BACKGROUND & GRID
  offctx.fillStyle = '#060608';
  offctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
  
  // Draw the 2.5D ground path
  offctx.fillStyle = '#0c0c10';
  offctx.fillRect(0, minGroundY, offscreenCanvas.width, maxGroundY - minGroundY);
  
  // Grid depth lines (perspectives)
  offctx.strokeStyle = '#18181b';
  offctx.lineWidth = 1;
  for (let y = minGroundY; y <= maxGroundY; y += 8) {
    offctx.beginPath();
    offctx.moveTo(0, y);
    offctx.lineTo(offscreenCanvas.width, y);
    offctx.stroke();
  }
  
  // Outer boundary line (Horizon and bottom borders)
  offctx.strokeStyle = '#27272a';
  offctx.lineWidth = 1;
  offctx.beginPath();
  offctx.moveTo(0, minGroundY);
  offctx.lineTo(offscreenCanvas.width, minGroundY);
  offctx.moveTo(0, maxGroundY);
  offctx.lineTo(offscreenCanvas.width, maxGroundY);
  offctx.stroke();
  
  // 2. DRAW ENTITY SHADOWS (Drawn first so they are under the bodies)
  drawShadow(player.x, player.y, 6 * player.squashX, 2 * player.squashY);
  drawShadow(dummy.x, dummy.y, 6.5, 2.2);
  
  // Draw Shunpo afterimages shadows
  afterimages.forEach(ghost => {
    drawShadow(ghost.x, ghost.y, 6 * ghost.life, 2 * ghost.life);
  });
  
  // 3. DYNAMIC Y-SORTING (Depth rendering)
  const renderList = [];
  
  // Add Player
  renderList.push({
    y: player.y,
    draw: () => drawPlayerEntity(
      player.x, player.y, player.facingDir, player.walkPhase, player.walkWeight,
      player.idleTimer, player.vx * 0.05, player.attackState, player.attackTimer, false, 1.0
    )
  });
  
  // Add target dummy
  renderList.push({
    y: dummy.y,
    draw: () => drawDummyEntity()
  });
  
  // Add afterimages (ghost silhouettes)
  afterimages.forEach(ghost => {
    renderList.push({
      y: ghost.y,
      draw: () => drawPlayerEntity(
        ghost.x, ghost.y, ghost.facingDir, ghost.walkPhase, ghost.walkWeight,
        ghost.idleTimer, ghost.torsoTilt, ghost.attackState, ghost.attackTimer || 0, true, ghost.life
      )
    });
  });
  
  // Sort by feet Y coordinate
  renderList.sort((a, b) => a.y - b.y);
  
  // Draw in order
  renderList.forEach(entity => entity.draw());
  
  // 4. DRAW PARTICLES (foreground)
  particles.forEach(p => {
    offctx.fillStyle = p.color;
    offctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
  });
  
  // 5. DRAW WEAPON SLASH TRAILS
  drawSlashTrail();
  
  // 6. BLIT TO MAIN CANVAS WITH SCREEN SHAKE
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  
  let shakeOffsetX = 0;
  let shakeOffsetY = 0;
  if (screenshake > 0) {
    shakeOffsetX = (Math.random() - 0.5) * screenshake * 3.5;
    shakeOffsetY = (Math.random() - 0.5) * screenshake * 3.5;
  }
  
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    offscreenCanvas, 
    0, 0, offscreenCanvas.width, offscreenCanvas.height,
    shakeOffsetX, shakeOffsetY, gameCanvas.width, gameCanvas.height
  );
}

// --- DRAW FLAT SHADOWS ---
function drawShadow(cx, cy, rx, ry) {
  offctx.save();
  offctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  offctx.beginPath();
  offctx.ellipse(Math.floor(cx), Math.floor(cy), rx, ry, 0, 0, Math.PI * 2);
  offctx.fill();
  offctx.restore();
}

// --- DRAW TARGET DUMMY ---
function drawDummyEntity() {
  const pivotX = dummy.x;
  const pivotY = dummy.y;
  const h = dummy.height;
  const w = dummy.width;
  
  offctx.save();
  offctx.translate(pivotX, pivotY);
  offctx.rotate(dummy.angle);
  
  const isFlashing = dummy.flashFrames > 0;
  
  // Base support ring
  offctx.fillStyle = isFlashing ? '#ffffff' : '#3f3f46';
  offctx.fillRect(-w/2 - 1, -2, w + 2, 2);
  
  // Main body log
  offctx.fillStyle = isFlashing ? '#ffffff' : '#713f12'; // dark wood
  offctx.fillRect(-w/2, -h, w, h);
  
  // Center wrap band (white bandage wrapping style)
  offctx.fillStyle = isFlashing ? '#ffffff' : '#e4e4e7';
  offctx.fillRect(-w/2 - 0.2, -h + 6, w + 0.4, 4);
  
  // Head block
  offctx.fillStyle = isFlashing ? '#ffffff' : '#a16207';
  offctx.fillRect(-w/2 + 1, -h - 5, w - 2, 5);
  
  // Target stick arms
  offctx.fillStyle = isFlashing ? '#ffffff' : '#ca8a04';
  offctx.fillRect(-w/2 - 4, -h + 8, 4, 1.5);
  offctx.fillRect(w/2, -h + 8, 4, 1.5);
  
  offctx.restore();
}

// --- DRAW SLASH TRAILS ---
function drawSlashTrail() {
  if (slashTrail.length < 2) return;
  
  offctx.save();
  // Getsuga style: Black core, bright crimson edges
  offctx.fillStyle = 'rgba(15, 15, 18, 0.9)';
  offctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
  offctx.lineWidth = 1.2;
  
  for (let i = 0; i < slashTrail.length - 1; i++) {
    const curr = slashTrail[i];
    const next = slashTrail[i + 1];
    
    offctx.beginPath();
    offctx.moveTo(Math.floor(curr.hand.x), Math.floor(curr.hand.y));
    offctx.lineTo(Math.floor(curr.tip.x), Math.floor(curr.tip.y));
    offctx.lineTo(Math.floor(next.tip.x), Math.floor(next.tip.y));
    offctx.lineTo(Math.floor(next.hand.x), Math.floor(next.hand.y));
    offctx.closePath();
    offctx.fill();
    offctx.stroke();
  }
  
  offctx.restore();
}

// --- DETAILED DRAW PLAYER / GHOST ENTITY ---
function drawPlayerEntity(x, y, dir, walkPhase, walkWeight, idleTimer, torsoTiltOverride, attackState, attackTimer, isGhost = false, ghostAlpha = 1.0) {
  
  // 1. ANATOMY RATIOS
  // Lower crouched position in combat idle
  const hipHeight = 8.5; 
  let hipBounceY = 0;
  
  if (Math.abs(player.vx) > 0.05 || Math.abs(player.vy) > 0.05) {
    hipBounceY = -Math.abs(Math.sin(walkPhase)) * config.walkBounce;
  } else {
    // Breathing sway height
    hipBounceY = Math.sin(idleTimer) * config.idleBreathAmp;
  }
  
  const hipX = x;
  const hipY = y - (hipHeight + hipBounceY);
  
  // Shinigami combat forward crouch lean
  let torsoTilt = dir * 0.22; // default crouch
  if (walkWeight > 0.1) {
    torsoTilt = dir * 0.38 * walkWeight; // anime sprint run lean
  }
  
  // Force slash direction lean
  if (attackState === 'swing') {
    torsoTilt = dir * 0.45;
  } else if (attackState === 'windup') {
    torsoTilt = -dir * 0.12;
  }
  
  const torsoW = 6;
  const torsoH = 7;
  const shoulderX = hipX + Math.sin(torsoTilt) * (torsoH * 0.85);
  const shoulderY = hipY - Math.cos(torsoTilt) * (torsoH * 0.85);
  
  // Head positioning
  let headLagX = 0;
  let headLagY = Math.sin(idleTimer - 0.4) * (config.idleBreathAmp * 0.3);
  if (walkWeight > 0.1) {
    headLagX = -dir * 0.8;
  }
  
  const headX = shoulderX + headLagX + Math.sin(torsoTilt) * 3.0;
  const headY = shoulderY + headLagY - Math.cos(torsoTilt) * 3.0;
  
  // 2. LEGS & FEET (Wide crouching spread in combat stance)
  const stride = config.walkStride;
  const stepH = config.walkStepHeight;
  
  // Left and Right Foot phase
  const phaseF = walkPhase;
  const phaseB = walkPhase + Math.PI;
  
  // Front Foot
  const cosF = Math.cos(phaseF);
  const sinF = Math.sin(phaseF);
  const targetFX = hipX + cosF * stride;
  const targetFY = y - (sinF > 0 ? sinF * stepH : 0);
  
  // Back Foot
  const cosB = Math.cos(phaseB);
  const sinB = Math.sin(phaseB);
  const targetBX = hipX + cosB * stride;
  const targetBY = y - (sinB > 0 ? sinB * stepH : 0);
  
  // Wide stance in idle combat
  const idleSpreadX = 4.0;
  const footX_front = lerp(hipX + dir * idleSpreadX, targetFX, walkWeight);
  const footY_front = lerp(y, targetFY, walkWeight);
  
  const footX_back = lerp(hipX - dir * idleSpreadX, targetBX, walkWeight);
  const footY_back = lerp(y, targetBY, walkWeight);
  
  // Solve IK
  const thighL = 5.0;
  const shinL = 5.0;
  
  const hipX_front = hipX + Math.sin(torsoTilt) * 0.8 - dir * 0.5;
  const hipY_front = hipY;
  const legFront = solveIK(hipX_front, hipY_front, footX_front, footY_front, thighL, shinL, dir);
  
  const hipX_back = hipX - Math.sin(torsoTilt) * 0.8 - dir * 1.2;
  const hipY_back = hipY;
  const legBack = solveIK(hipX_back, hipY_back, footX_back, footY_back, thighL, shinL, dir);
  
  // 3. ARMS
  const armL1 = 4.0;
  const armL2 = 4.0;
  
  let angleBackArm = Math.PI * 0.5;
  let angleFrontArm = Math.PI * 0.5;
  
  if (walkWeight > 0.15) {
    // Front arm holds sword raised forward-up
    angleFrontArm = dir === 1 ? -Math.PI * 0.18 + Math.cos(walkPhase) * 0.1 : -Math.PI * 0.82 - Math.cos(walkPhase) * 0.1;
    angleBackArm = dir === 1 ? Math.PI * 0.5 - Math.cos(walkPhase) * 0.3 : Math.PI * 0.5 + Math.cos(walkPhase) * 0.3;
  } else {
    // Idle stance guarding arms
    const idleSway = Math.sin(idleTimer) * 0.04;
    // Front hand holds katana down and forward
    angleFrontArm = dir === 1 ? Math.PI * 0.38 + idleSway : Math.PI * 0.62 - idleSway;
    // Back arm is tucked up in guard
    angleBackArm = dir === 1 ? Math.PI * 0.68 - idleSway : Math.PI * 0.32 + idleSway;
  }
  
  const shX_back = shoulderX - dir * 1.2;
  const shY_back = shoulderY;
  let elX_back = shX_back + Math.cos(angleBackArm) * armL1;
  let elY_back = shY_back + Math.sin(angleBackArm) * armL1;
  let handX_back = elX_back + Math.cos(angleBackArm + dir * 0.3) * armL2;
  let handY_back = elY_back + Math.sin(angleBackArm + dir * 0.3) * armL2;
  
  const shX_front = shoulderX + dir * 1.2;
  const shY_front = shoulderY;
  
  // Call helper to compute waist slash hand position and sword angle
  const kState = getKatanaState(attackState, attackTimer, x, y, dir, walkWeight);
  let handX_front = kState.handX;
  let handY_front = kState.handY;
  let swordAngle = kState.swordAngle;
  
  // Solve IK for the arm to reach the hand target
  const armIK = solveIK(shX_front, shY_front, handX_front, handY_front, armL1, armL2, -dir);
  let elX_front = armIK.bx;
  let elY_front = armIK.by;
  handX_front = armIK.cx;
  handY_front = armIK.cy;
  
  // Add swing coordinate records to slash trail
  if (attackState === 'swing' && !isGhost) {
    const swordLen = 17;
    const tipX = handX_front + Math.cos(swordAngle) * swordLen;
    const tipY = handY_front + Math.sin(swordAngle) * swordLen;
    
    slashTrail.push({
      hand: { x: handX_front, y: handY_front },
      tip: { x: tipX, y: tipY },
      alpha: 1.0
    });
    if (slashTrail.length > 7) slashTrail.shift();
  }
  
  // 4. MESH COLOR RENDERING
  // Configure ghost theme or default theme
  const coatColor = isGhost ? `rgba(24, 24, 27, ${ghostAlpha})` : '#18181b'; // Black Shihakusho
  const skinColor = isGhost ? `rgba(255, 255, 255, ${ghostAlpha})` : '#fee2e2'; // Pale skin
  const obiColor = isGhost ? `rgba(255, 255, 255, ${ghostAlpha})` : '#ffffff';  // White belt Obi
  const hairColor = isGhost ? `rgba(239, 68, 68, ${ghostAlpha * 0.85})` : '#ea580c'; // Reiatsu orange/red hair
  
  // Back Leg
  drawBone(hipX_back, hipY_back, legBack.bx, legBack.by, 2.5, coatColor);
  drawBone(legBack.bx, legBack.by, legBack.cx, legBack.cy, 2.2, coatColor);
  drawBone(legBack.cx, legBack.cy, legBack.cx + dir * 1.5, legBack.cy, 1.5, isGhost ? coatColor : '#27272a'); // white tabi boot
  
  // Back Arm
  drawBone(shX_back, shY_back, elX_back, elY_back, 2.0, coatColor);
  drawBone(elX_back, elY_back, handX_back, handY_back, 1.5, skinColor);
  
  // Torso
  offctx.save();
  offctx.translate(hipX, hipY);
  offctx.rotate(torsoTilt);
  offctx.scale(isGhost ? 1.0 : player.squashX, isGhost ? 1.0 : player.squashY);
  
  offctx.fillStyle = coatColor;
  offctx.fillRect(-torsoW/2, -torsoH, torsoW, torsoH);
  
  // White collar trimming diagonal lines
  offctx.strokeStyle = obiColor;
  offctx.lineWidth = 0.8;
  offctx.beginPath();
  offctx.moveTo(-torsoW/2 + 1, -torsoH);
  offctx.lineTo(0, -torsoH + 3.5);
  offctx.moveTo(torsoW/2 - 1, -torsoH);
  offctx.lineTo(0, -torsoH + 3.5);
  offctx.stroke();
  
  // Obi white belt
  offctx.fillStyle = obiColor;
  offctx.fillRect(-torsoW/2, -1.5, torsoW, 1.0);
  
  offctx.restore();
  
  // Head & Hair
  offctx.save();
  offctx.translate(headX, headY);
  offctx.rotate(torsoTilt * 0.6);
  
  offctx.fillStyle = skinColor;
  offctx.fillRect(-3, -3, 6, 6);
  
  // Orange spiky shonen hair
  offctx.fillStyle = hairColor;
  offctx.fillRect(-3.5, -3.5, 7, 2.2); // top scalp
  offctx.fillRect(dir === 1 ? -3.5 : 1.5, -1.5, 2, 4.5); // side/back spiky
  // Extra spiky dots on top
  offctx.fillRect(-2, -4.5, 1.2, 1);
  offctx.fillRect(1, -4.5, 1.2, 1);
  
  // Eye (cool hollow/stern black dot)
  offctx.fillStyle = isGhost ? hairColor : '#09090b';
  offctx.fillRect(dir === 1 ? 1.5 : -2.5, -0.8, 1, 1);
  
  offctx.restore();
  
  // Front Leg
  drawBone(hipX_front, hipY_front, legFront.bx, legFront.by, 2.5, coatColor);
  drawBone(legFront.bx, legFront.by, legFront.cx, legFront.cy, 2.2, coatColor);
  drawBone(legFront.cx, legFront.cy, legFront.cx + dir * 1.8, legFront.cy, 1.5, isGhost ? coatColor : '#18181b'); // tabi sandals
  
  // Front Arm
  drawBone(shX_front, shY_front, elX_front, elY_front, 2.0, coatColor);
  drawBone(elX_front, elY_front, handX_front, handY_front, 1.5, skinColor);
  
  // Zanpakuto (Katana)
  drawZanpakuto(handX_front, handY_front, swordAngle, isGhost, ghostAlpha);
  
  // Skeleton
  if (config.showSkeleton && !isGhost) {
    drawSkeletonBones(
      hipX, hipY, shoulderX, shoulderY, headX, headY,
      shX_front, shY_front, elX_front, elY_front, handX_front, handY_front,
      shX_back, shY_back, elX_back, elY_back, handX_back, handY_back,
      hipX_front, hipY_front, legFront,
      hipX_back, hipY_back, legBack
    );
  }
}

// --- DRAW ZANPAKUTO (Tensa Zangetsu Style) ---
function drawZanpakuto(x, y, angle, isGhost, alpha) {
  const bladeL = 17; // Sleek thin long sword
  
  offctx.save();
  offctx.translate(x, y);
  offctx.rotate(angle);
  
  const hiltColor = isGhost ? `rgba(239, 68, 68, ${alpha})` : '#09090b';
  const bladeColor = isGhost ? `rgba(255, 255, 255, ${alpha})` : '#18181b'; // Black blade
  const edgeColor = isGhost ? `rgba(239, 68, 68, ${alpha})` : '#a1a1aa';  // Silver edges highlight
  const ribbonColor = isGhost ? `rgba(239, 68, 68, ${alpha * 0.7})` : '#ef4444'; // Red tassels/ribbon
  
  // 1. Hilt (Tsuka)
  offctx.strokeStyle = hiltColor;
  offctx.lineWidth = 1.0;
  offctx.beginPath();
  offctx.moveTo(0, 0);
  offctx.lineTo(-3.5, 0);
  offctx.stroke();
  
  // Red hilt ribbon hanging (tassel) - dangles downwards due to gravity
  offctx.strokeStyle = ribbonColor;
  offctx.lineWidth = 0.8;
  offctx.beginPath();
  offctx.moveTo(-3.5, 0);
  // curves down
  offctx.lineTo(-4.0, 3.5);
  offctx.stroke();
  
  // 2. Guard (Tsuba) - small black swastika shape
  offctx.strokeStyle = hiltColor;
  offctx.lineWidth = 1.0;
  offctx.beginPath();
  offctx.moveTo(-0.5, -1.8);
  offctx.lineTo(-0.5, 1.8);
  offctx.stroke();
  
  // 3. Katana Blade (Thin black blade with silver edge highlight)
  offctx.strokeStyle = bladeColor;
  offctx.lineWidth = 1.0;
  offctx.beginPath();
  offctx.moveTo(0, 0);
  offctx.lineTo(bladeL, 0);
  offctx.stroke();
  
  // Silver edge highlight line along the blade
  if (!isGhost) {
    offctx.strokeStyle = edgeColor;
    offctx.lineWidth = 0.5;
    offctx.beginPath();
    offctx.moveTo(0.5, 0.4);
    offctx.lineTo(bladeL - 1, 0.4);
    offctx.stroke();
  }
  
  // White sharp tip pixel
  offctx.fillStyle = isGhost ? bladeColor : '#ffffff';
  offctx.fillRect(bladeL - 0.8, -0.4, 0.8, 0.8);
  
  offctx.restore();
}

// Draw skeleton helper lines
function drawSkeletonBones(
  hipX, hipY, shX, shY, hdX, hdY,
  shX_F, shY_F, elX_F, elY_F, hX_F, hY_F,
  shX_B, shY_B, elX_B, elY_B, hX_B, hY_B,
  hipX_F, hipY_F, legF,
  hipX_B, hipY_B, legB
) {
  offctx.save();
  offctx.strokeStyle = '#ef4444'; // Red bones for Shinigami Reiatsu
  offctx.lineWidth = 0.6;
  
  drawLine(hipX, hipY, shX, shY);
  drawJoint(shX, shY);
  drawJoint(hdX, hdY);
  
  drawLine(shX_F, shY_F, elX_F, elY_F);
  drawLine(elX_F, elY_F, hX_F, hY_F);
  drawJoint(elX_F, elY_F);
  drawJoint(hX_F, hY_F);
  
  drawLine(shX_B, shY_B, elX_B, elY_B);
  drawLine(elX_B, elY_B, hX_B, hY_B);
  drawJoint(elX_B, elY_B);
  drawJoint(hX_B, hY_B);
  
  drawLine(hipX_F, hipY_F, legF.bx, legF.by);
  drawLine(legF.bx, legF.by, legF.cx, legF.cy);
  drawJoint(hipX_F, hipY_F);
  drawJoint(legF.bx, legF.by);
  drawJoint(legF.cx, legF.cy, '#ffffff'); // white foot joint indicator
  
  drawLine(hipX_B, hipY_B, legB.bx, legB.by);
  drawLine(legB.bx, legB.by, legB.cx, legB.cy);
  drawJoint(hipX_B, hipY_B);
  drawJoint(legB.bx, legB.by);
  drawJoint(legB.cx, legB.cy, '#ffffff');
  
  offctx.restore();
}

function drawBone(x1, y1, x2, y2, thickness, color) {
  offctx.strokeStyle = color;
  offctx.lineWidth = thickness;
  offctx.lineCap = 'square';
  offctx.beginPath();
  offctx.moveTo(Math.floor(x1), Math.floor(y1));
  offctx.lineTo(Math.floor(x2), Math.floor(y2));
  offctx.stroke();
}

function drawLine(x1, y1, x2, y2) {
  offctx.beginPath();
  offctx.moveTo(x1, y1);
  offctx.lineTo(x2, y2);
  offctx.stroke();
}

function drawJoint(x, y, color = '#ef4444') {
  offctx.fillStyle = color;
  offctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
}

// --- INIT SYSTEM RUN ---
setupSliders();
updateResolution();
requestAnimationFrame(gameLoop);
console.log("Shinigami 2.5D Motion Sandbox initialized!");
