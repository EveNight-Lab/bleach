/**
 * 블리치 사신 서바이벌 - HTML5 Canvas 2D 렌더러
 * 60px 전술 그리드, 3대 호로 고정 예고 구역, 월아천충 검기, 영압 오라 렌더링
 */

import { state } from '../core/GameState';

interface ShunpoAfterimage {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

const afterimages: ShunpoAfterimage[] = [];

export function createShunpoAfterimages(startX: number, startY: number, endX: number, endY: number) {
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    afterimages.push({
      x: startX + (endX - startX) * t,
      y: startY + (endY - startY) * t,
      life: 0.28,
      maxLife: 0.28
    });
  }
}

export function createHitParticles(x: number, y: number, color: string, count: number = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 160;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.25,
      maxLife: 0.55,
      size: 2 + Math.random() * 3.5,
      color
    });
  }
}

export function addFloatingText(x: number, y: number, text: string, color: string = '#ffffff') {
  state.floatingTexts.push({
    x,
    y,
    text,
    color,
    life: 0.65,
    maxLife: 0.65,
    vy: -45
  });
}

export function renderCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const p = state.player;

  // 📌 카메라 줌 아웃 (모바일 가로 짧은 뷰포트에서 넓은 전장을 볼 수 있도록 0.58x ~ 0.65x 광활한 시야 확장!)
  const zoom = Math.min(1.0, Math.max(0.58, height / 580));

  state.camera.x = p.x - (width / zoom) / 2;
  state.camera.y = p.y - (height / zoom) / 2;

  // 1. 전장 배경 클리어
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  // 📌 카메라 센터링 및 광활한 시야 줌아웃 행렬 매트릭스
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-p.x, -p.y);

  // 2. 60px 전술 그리드 & 청록색 영압 장막 (Spirit Barrier)
  drawArenaGrid(ctx);

  // 3. 3대 전술 호로 예고 구역 (World-Anchored Danger Zone Mask)
  drawEnemyTelegraphs(ctx);

  // 4. 영력 경험치 구체 렌더링
  drawExpGems(ctx);

  // 5. 순보 잔상 연출 렌더링
  drawAfterimages(ctx);

  // 6. 월아천충 및 기본 공격 렌더링
  drawAttacks(ctx);

  // 7. 엘리트 호로 적 렌더링
  drawEnemies(ctx);

  // 8. 적 세로 투사체 렌더링
  drawEnemyProjectiles(ctx);

  // 9. 사신 플레이어 & 영압 오라 링 렌더링
  drawPlayer(ctx);

  // 10. 파티클 및 플로팅 텍스트 렌더링
  drawParticles(ctx);
  drawFloatingTexts(ctx);

  ctx.restore();

  // 11. 화면 피격 붉은 플래시 오버레이
  if (state.playerHitFlashTimer > 0) {
    state.playerHitFlashTimer -= 0.016;
    ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.35, state.playerHitFlashTimer * 1.5)})`;
    ctx.fillRect(0, 0, width, height);
  }
}

// 60px 타일 전술 바닥 및 청록색 영압 장막 (Spirit Barrier Glow)
function drawArenaGrid(ctx: CanvasRenderingContext2D) {
  const halfW = state.arena.width / 2;
  const halfH = state.arena.height / 2;

  // 60px 격자 무늬
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;

  const gridSize = 60;
  const startX = -halfW;
  const endX = halfW;
  const startY = -halfH;
  const endY = halfH;

  ctx.beginPath();
  for (let x = startX; x <= endX; x += gridSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();

  // 외곽 청록색 영압 장막 (Spirit Barrier Glow)
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 18;
  ctx.strokeRect(-halfW, -halfH, state.arena.width, state.arena.height);
  ctx.shadowBlur = 0;
}

// 📌 3대 전술 호로 예고 구역 (World-Anchored Progressive Charge Fill Telegraph)
function drawEnemyTelegraphs(ctx: CanvasRenderingContext2D) {
  for (const enemy of state.enemies) {
    if (enemy.type !== 'MidDash') continue;

    const isCharging = enemy.state === 'charging';
    const isAction = enemy.state === 'action';
    if (!isCharging && !isAction) continue;

    // 70% 고정 좌표 또는 현재 위치
    const anchorX = enemy.lockedWorldX !== undefined ? enemy.lockedWorldX : enemy.x;
    const anchorY = enemy.lockedWorldY !== undefined ? enemy.lockedWorldY : enemy.y;
    const anchorAngle = enemy.lockedAngle !== undefined ? enemy.lockedAngle : 0;
    const progress = isAction ? 1.0 : Math.min(1.0, Math.max(0, enemy.telegraphProgress || 0));

    ctx.save();
    ctx.translate(anchorX, anchorY);
    ctx.rotate(anchorAngle);

    if (enemy.pattern === 'Line' || !enemy.pattern) {
      // 📌 Line: 600px x 68px 차오르는 게이지 회랑
      // 1. 은은한 전체 구역 가이드 박스
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2;
      ctx.fillRect(0, -34, 600, 68);
      ctx.strokeRect(0, -34, 600, 68);

      // 2. 0% -> 100% 차오르는 빨간색 실시간 충전 게이지
      const fillW = 600 * progress;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
      ctx.fillRect(0, -34, fillW, 68);

      // 3. 선단부 선명한 충전 프론트라인 경계선 (완충 임박 가시성 100%)
      if (isCharging && fillW > 2) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fillW - 3, -34, 4, 68);
      }
    }

    ctx.restore();
  }

  // 📌 세로 사출 호로 조준선 (Progressive Cero Laser Sight Line & Charging Orb - 2.0s Charge & 70% Lock)
  for (const enemy of state.enemies) {
    if (enemy.type === 'Projectile' && enemy.ceroCooldown !== undefined && enemy.ceroCooldown <= 2.0) {
      const p = state.player;
      const angle = enemy.lockedAngle !== undefined ? enemy.lockedAngle : Math.atan2(p.y - enemy.y, p.x - enemy.x);
      const chargeRatio = Math.max(0, Math.min(1.0, 1 - (enemy.ceroCooldown / 2.0)));

      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(angle);

      // 1. 명확한 550px 최종 도달 위치 전 장거리 레이저 회랑 가이드 점선 (가시성 100%)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(550, 0);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. 0% -> 100% 최종 도달 지점(550px)까지 차오르는 진한 에메랄드 충전 레이저선
      const fillLen = 550 * chargeRatio;
      if (fillLen > 2) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4.5;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(fillLen, 0);
        ctx.stroke();

        // 3. 100% 완충 지점 발사 프론트라인 흰색 글로우 팁 (Tip)
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(fillLen, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 4. 세로 사출 구체 에너지 응축 렌더링
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 14 * chargeRatio;
      ctx.beginPath();
      ctx.arc(enemy.radius + 4, 0, 3 + chargeRatio * 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D) {
  const p = state.player;

  ctx.save();
  ctx.translate(p.x, p.y);

  if (p.invincibleTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // 귀(鬼) 스탯 영압 오라 링
  const sub = state.subStats;
  if (sub && sub.auraRadius > 0) {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, sub.auraRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 영압 오라 글로우
  const auraSize = p.radius + 12 + state.stats.gwi * 4;
  const grad = ctx.createRadialGradient(0, 0, p.radius * 0.5, 0, 0, auraSize);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, auraSize, 0, Math.PI * 2);
  ctx.fill();

  // 사신 캐릭터 몸체 (검은 사패장)
  ctx.fillStyle = '#090d16';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 참백도 방향 표시선
  ctx.rotate(p.angle);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(p.radius + 14, 0);
  ctx.stroke();

  ctx.restore();
}

function drawEnemies(ctx: CanvasRenderingContext2D) {
  for (const enemy of state.enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    if (enemy.spawnGrace > 0) {
      ctx.globalAlpha = 0.4;
    }

    // 🎯 40% 확률 길목 예측 차단 AI 호로 (붉은 전술 그림자 글로우)
    if (enemy.isPredictive) {
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 18;
    } else {
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    const r = enemy.radius;

    if (enemy.type === 'Melee') {
      // 📌 근거리형: ■ 네모 (Square)
      ctx.fillRect(-r, -r, r * 2, r * 2);
    } else if (enemy.type === 'MidDash') {
      // 📌 중거리형: ▲ 세모 (Triangle)
      const rot = enemy.lockedAngle !== undefined ? enemy.lockedAngle : (Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x));
      ctx.rotate(rot);
      ctx.moveTo(r * 1.3, 0);
      ctx.lineTo(-r * 0.9, -r * 0.9);
      ctx.lineTo(-r * 0.9, r * 0.9);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.type === 'Projectile') {
      // 📌 원거리형: ◆ 마름모 (Diamond)
      ctx.moveTo(0, -r * 1.25);
      ctx.lineTo(r * 1.1, 0);
      ctx.lineTo(0, r * 1.25);
      ctx.lineTo(-r * 1.1, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (enemy.type === 'Melee') {
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 체력바
    if (enemy.hp < enemy.maxHp) {
      const barW = enemy.radius * 2.2;
      const barH = 4;
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(-barW / 2, -enemy.radius - 12, barW, barH);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-barW / 2, -enemy.radius - 12, barW * hpRatio, barH);
    }

    ctx.restore();
  }
}

function drawAttacks(ctx: CanvasRenderingContext2D) {
  for (const atk of state.attacks) {
    ctx.save();
    ctx.translate(atk.x, atk.y);
    ctx.rotate(atk.angle);

    if (atk.attackType === 'Slash') {
      // ⚔️ 베기 (월아천충): 붉은 영압 초승달 참격파 + 하얀 고열 테두리
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 8;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, atk.radius, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, atk.radius, -Math.PI / 3.5, Math.PI / 3.5);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (atk.attackType === 'Thrust') {
      // 🗡️ 찌르기: 좁고 예리한 전방 관통 검기
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, 0, atk.radius * 2.2, atk.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (atk.attackType === 'Circle') {
      const progress = 1 - (atk.life / atk.maxLife);
      const currRadius = atk.radius * progress;
      ctx.strokeStyle = `rgba(56, 189, 248, ${1 - progress})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, currRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (atk.attackType === 'Flurry') {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.fillRect(-atk.radius, -2.5, atk.radius * 2, 5);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}

function drawEnemyProjectiles(ctx: CanvasRenderingContext2D) {
  for (const proj of state.enemyProjectiles) {
    ctx.save();

    // 1. 잔상 잔류 궤적 (Motion Trail)
    const norm = Math.hypot(proj.vx, proj.vy) || 1;
    const dirX = proj.vx / norm;
    const dirY = proj.vy / norm;

    for (let k = 1; k <= 3; k++) {
      ctx.save();
      ctx.translate(proj.x - dirX * k * 8, proj.y - dirY * k * 8);
      ctx.globalAlpha = 0.5 - k * 0.12;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(3, proj.radius - k * 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. 메인 세로 투사체 구체 (강렬한 청록/에메랄드 글로우 & 하얀 고열 핵)
    ctx.translate(proj.x, proj.y);
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 18;

    // 외곽 에메랄드 원
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(10, proj.radius + 3), 0, Math.PI * 2);
    ctx.fill();

    // 중심 고열 하얀 코어
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawExpGems(ctx: CanvasRenderingContext2D) {
  for (const gem of state.expGems) {
    ctx.save();
    ctx.translate(gem.x, gem.y);
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(0, -gem.radius * 1.2);
    ctx.lineTo(gem.radius, 0);
    ctx.lineTo(0, gem.radius * 1.2);
    ctx.lineTo(-gem.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawAfterimages(ctx: CanvasRenderingContext2D) {
  for (let i = afterimages.length - 1; i >= 0; i--) {
    const img = afterimages[i];
    img.life -= 0.016;

    if (img.life <= 0) {
      afterimages.splice(i, 1);
      continue;
    }

    const alpha = img.life / img.maxLife;
    ctx.save();
    ctx.translate(img.x, img.y);
    ctx.globalAlpha = alpha * 0.45;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, state.player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D) {
  const dt = 0.016;
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }

    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;

    ctx.save();
    ctx.globalAlpha = pt.life / pt.maxLife;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D) {
  const dt = 0.016;
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const txt = state.floatingTexts[i];
    txt.life -= dt;
    if (txt.life <= 0) {
      state.floatingTexts.splice(i, 1);
      continue;
    }

    txt.y += txt.vy * dt;

    ctx.save();
    ctx.globalAlpha = txt.life / txt.maxLife;
    ctx.font = 'bold 15px Pretendard, sans-serif';
    ctx.fillStyle = txt.color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'center';
    ctx.fillText(txt.text, txt.x, txt.y);
    ctx.restore();
  }
}
