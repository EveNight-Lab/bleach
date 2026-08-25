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

  // 📌 카메라 줌 아웃
  const zoom = Math.min(1.0, Math.max(0.58, height / 580));

  state.camera.x = p.x - (width / zoom) / 2;
  state.camera.y = p.y - (height / zoom) / 2;

  // 1. 전장 배경 클리어
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  // 📌 던파(DFO) 2.5D 벨트스크롤 시점 사영 변환: Y축을 0.68배 압축하여 35도 경사각 입체 전장 구축!
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom * 0.68);
  ctx.translate(-p.x, -p.y);

  // 2. 60px 2.5D 전술 그리드 & 청록색 영압 장막 (Spirit Barrier)
  drawArenaGrid(ctx);

  // 3. 3대 전술 호로 예고 구역 (World-Anchored Danger Zone Mask)
  drawEnemyTelegraphs(ctx);

  // 4. 발밑 입체 타원 그림자 레이어 (Floor Elliptical Shadow Pass - 바닥에 깔리는 그림자!)
  drawFloorShadows(ctx);

  // 5. 순보 잔상 연출 렌더링
  drawAfterimages(ctx);

  // 6. 월아천충 및 기본 공격 렌더링
  drawAttacks(ctx);

  // 7. 📌 던파(DFO) 2.5D Y-Depth 입체 정렬 렌더링 (Y좌표가 아래쪽인 객체가 위로 입체 중첩!)
  drawYSortedEntities(ctx);

  // 8. 적 세로 투사체 렌더링
  drawEnemyProjectiles(ctx);

  // 9. 파티클 및 플로팅 텍스트 렌더링
  drawParticles(ctx);
  drawFloatingTexts(ctx);

  ctx.restore();

  // 10. 화면 피격 붉은 플래시 오버레이
  if (state.playerHitFlashTimer > 0) {
    state.playerHitFlashTimer -= 0.016;
    ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.35, state.playerHitFlashTimer * 1.5)})`;
    ctx.fillRect(0, 0, width, height);
  }
}

// 📌 2.5D 바닥 입체 그림자 패스 (Footstep Elliptical Shadows - 2.5D 원근 투시 밀착)
function drawFloorShadows(ctx: CanvasRenderingContext2D) {
  // 1. 경험치 구체 그림자
  for (const gem of state.expGems) {
    const proj = project2DPoint(gem.x, gem.y);
    drawSingleShadow(ctx, proj.x, proj.y, gem.radius * 0.7);
  }
  // 2. 호로 몬스터 그림자
  for (const enemy of state.enemies) {
    const proj = project2DPoint(enemy.x, enemy.y);
    drawSingleShadow(ctx, proj.x, proj.y, enemy.radius);
  }
  // 3. 플레이어 그림자
  const p = state.player;
  const pProj = project2DPoint(p.x, p.y);
  drawSingleShadow(ctx, pProj.x, pProj.y, p.radius * 1.15, 'rgba(56, 189, 248, 0.45)');
}

function drawSingleShadow(ctx: CanvasRenderingContext2D, px: number, py: number, radius: number, glowColor?: string) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(px, py + radius * 0.55, radius * 1.25, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
  ctx.fill();
  if (glowColor) {
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

// 📌 던파(DFO) 스타일 Y-Depth 정렬 렌더링 엔진 (Sort by Y)
function drawYSortedEntities(ctx: CanvasRenderingContext2D) {
  interface RenderItem {
    y: number;
    draw: () => void;
  }

  const renderQueue: RenderItem[] = [];

  // 1. 플레이어 등록
  renderQueue.push({
    y: state.player.y,
    draw: () => drawPlayer(ctx)
  });

  // 2. 몬스터 등록
  for (const enemy of state.enemies) {
    renderQueue.push({
      y: enemy.y,
      draw: () => drawSingleEnemy(ctx, enemy)
    });
  }

  // 3. 영자 경험치 결정 등록
  for (const gem of state.expGems) {
    renderQueue.push({
      y: gem.y,
      draw: () => drawSingleExpGem(ctx, gem)
    });
  }

  // Y 좌표 오름차순 정렬 (화면 위쪽 객체를 먼저 그리고, 아래쪽 객체를 위에 덮어 그림!)
  renderQueue.sort((a, b) => a.y - b.y);

  // 입체 정렬 순서대로 렌더링 실행!
  for (const item of renderQueue) {
    item.draw();
  }
}

// 📌 2.5D 원근법 사다리꼴 사영 매핑 (Trapezoidal Vanishing-Point Projection: 위는 좁고 아래는 넓어지는 진짜 입체 원근법!)
function project2DPoint(wx: number, wy: number) {
  const halfH = state.arena.height / 2;
  const normY = wy / halfH; // -1.0 (상단/원경) ~ +1.0 (하단/근경)
  const perspectiveScale = 1.0 + normY * 0.26; // 상단은 0.74배로 좁아지고, 하단은 1.26배로 넓어짐!
  return {
    x: wx * perspectiveScale,
    y: wy
  };
}

// 📌 2.5D 던파(DFO) 사다리꼴 원근 바닥 타일 및 3D 영압 유리 장막 벽 (True Trapezoidal 2.5D Stage)
function drawArenaGrid(ctx: CanvasRenderingContext2D) {
  const halfW = state.arena.width / 2;
  const halfH = state.arena.height / 2;
  const gridSize = 60;

  // 1. 2.5D 사다리꼴 원근 타일링 렌더링 (위는 좁고 아래는 넓어지는 압도적 원근 입체감!)
  let colIdx = 0;
  for (let x = -halfW; x < halfW; x += gridSize) {
    let rowIdx = 0;
    for (let y = -halfH; y < halfH; y += gridSize) {
      const isAlt = (colIdx + rowIdx) % 2 === 0;

      // 사다리꼴 4개 꼭지점 변환 연산
      const p1 = project2DPoint(x, y);
      const p2 = project2DPoint(x + gridSize, y);
      const p3 = project2DPoint(x + gridSize, y + gridSize);
      const p4 = project2DPoint(x, y + gridSize);

      // (1) 사다리꼴 바닥 타일 채우기
      ctx.fillStyle = isAlt ? 'rgba(15, 23, 42, 0.60)' : 'rgba(6, 10, 20, 0.80)';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();

      // (2) 사다리꼴 타일 테두리 선 (원근 격자선)
      ctx.strokeStyle = isAlt ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // (3) 사다리꼴 교차점 콤팩트 전술 십자점
      ctx.fillStyle = 'rgba(0, 229, 255, 0.28)';
      ctx.fillRect(p1.x - 1.5, p1.y - 1.5, 3, 3);

      rowIdx++;
    }
    colIdx++;
  }

  // 2. 📌 사다리꼴 원근 외곽 3D 영압 유리 장막 벽 (Trapezoidal 3D Glass Barrier Wall)
  const wallH = 80;

  // 바닥 4개 사다리꼴 모서리 꼭지점 연산
  const botLeft = project2DPoint(-halfW, halfH);
  const botRight = project2DPoint(halfW, halfH);
  const topLeft = project2DPoint(-halfW, -halfH);
  const topRight = project2DPoint(halfW, -halfH);

  ctx.save();

  // (1) 상단 후면 사다리꼴 유리 벽면
  const topGrad = ctx.createLinearGradient(0, topLeft.y, 0, topLeft.y - wallH);
  topGrad.addColorStop(0, 'rgba(0, 229, 255, 0.28)');
  topGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.12)');
  topGrad.addColorStop(1, 'rgba(0, 229, 255, 0.03)');

  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(topRight.x, topRight.y - wallH);
  ctx.lineTo(topLeft.x, topLeft.y - wallH);
  ctx.closePath();
  ctx.fill();

  // (2) 좌측 사다리꼴 유리 벽면
  const leftGrad = ctx.createLinearGradient(topLeft.x, 0, topLeft.x - wallH, 0);
  leftGrad.addColorStop(0, 'rgba(0, 229, 255, 0.22)');
  leftGrad.addColorStop(1, 'rgba(0, 229, 255, 0.02)');

  ctx.fillStyle = leftGrad;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(botLeft.x, botLeft.y);
  ctx.lineTo(botLeft.x, botLeft.y - wallH);
  ctx.lineTo(topLeft.x, topLeft.y - wallH);
  ctx.closePath();
  ctx.fill();

  // (3) 유리 대각선 빛반사 하이라이트 띠
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(topLeft.x + 100, topLeft.y);
  ctx.lineTo(topLeft.x + 320, topLeft.y - wallH);
  ctx.moveTo(topLeft.x + 180, topLeft.y);
  ctx.lineTo(topLeft.x + 400, topLeft.y - wallH);
  ctx.stroke();

  // (4) 바닥 사다리꼴 청록색 영압 펜스
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(botRight.x, botRight.y);
  ctx.lineTo(botLeft.x, botLeft.y);
  ctx.closePath();
  ctx.stroke();

  // (5) 3D 유리벽 상단 레일 림 & 결합 기둥
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y - wallH);
  ctx.lineTo(topRight.x, topRight.y - wallH);
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(topLeft.x, topLeft.y - wallH);
  ctx.moveTo(topRight.x, topRight.y);
  ctx.lineTo(topRight.x, topRight.y - wallH);
  ctx.stroke();

  ctx.restore();
}

// 📌 3대 전술 호로 예고 구역 (2.5D 사다리꼴 원근 바닥밀착 3D Danger Zone Mask)
function drawEnemyTelegraphs(ctx: CanvasRenderingContext2D) {
  for (const enemy of state.enemies) {
    if (enemy.type !== 'MidDash') continue;

    const isCharging = enemy.state === 'charging';
    const isAction = enemy.state === 'action';
    if (!isCharging && !isAction) continue;

    const anchorX = enemy.lockedWorldX !== undefined ? enemy.lockedWorldX : enemy.x;
    const anchorY = enemy.lockedWorldY !== undefined ? enemy.lockedWorldY : enemy.y;
    const anchorAngle = enemy.lockedAngle !== undefined ? enemy.lockedAngle : 0;
    const progress = isAction ? 1.0 : Math.min(1.0, Math.max(0, enemy.telegraphProgress || 0));

    const length = 600;
    const halfW = 34;

    const cosA = Math.cos(anchorAngle);
    const sinA = Math.sin(anchorAngle);

    // 바닥 2D 코너 4개 좌표 연산
    const calcCorner = (localX: number, localY: number) => {
      const wx = anchorX + cosA * localX - sinA * localY;
      const wy = anchorY + sinA * localX + cosA * localY;
      return project2DPoint(wx, wy);
    };

    // 1. 전체 영역 4개 원근 모서리
    const p0 = calcCorner(0, -halfW);
    const p1 = calcCorner(0, halfW);
    const p2 = calcCorner(length, halfW);
    const p3 = calcCorner(length, -halfW);

    // 은은한 2.5D 바닥 밀착 전체 예고 회랑
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. 0% -> 100% 차오르는 실시간 붉은 충전 회랑
    const fillLen = length * progress;
    if (fillLen > 2) {
      const fp2 = calcCorner(fillLen, halfW);
      const fp3 = calcCorner(fillLen, -halfW);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.70)';
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(fp2.x, fp2.y);
      ctx.lineTo(fp3.x, fp3.y);
      ctx.closePath();
      ctx.fill();

      // 3. 선단부 흰색 글로우 프론트라인
      if (isCharging) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fp3.x, fp3.y);
        ctx.lineTo(fp2.x, fp2.y);
        ctx.stroke();
      }
    }
  }

  // 📌 세로 사출 호로 조준선 (2.5D 사다리꼴 원근 바닥 밀착 에메랄드 레이저선)
  for (const enemy of state.enemies) {
    if (enemy.type === 'Projectile' && enemy.ceroCooldown !== undefined && enemy.ceroCooldown <= 2.0) {
      const p = state.player;
      const angle = enemy.lockedAngle !== undefined ? enemy.lockedAngle : Math.atan2(p.y - enemy.y, p.x - enemy.x);
      const chargeRatio = Math.max(0, Math.min(1.0, 1 - (enemy.ceroCooldown / 2.0)));

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const pStart = project2DPoint(enemy.x, enemy.y);
      const pEnd = project2DPoint(enemy.x + cosA * 550, enemy.y + sinA * 550);
      const pFill = project2DPoint(enemy.x + cosA * (550 * chargeRatio), enemy.y + sinA * (550 * chargeRatio));

      // 1. 장거리 레이저 바닥 점선 가이드
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.40)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. 0% -> 100% 차오르는 진한 에메랄드 레이저선
      if (chargeRatio > 0.05) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pFill.x, pFill.y);
        ctx.stroke();

        // 3. 발사 프론트라인 글로우 팁
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(pFill.x, pFill.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 4. 구체 응축 이펙트
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 14 * chargeRatio;
      ctx.beginPath();
      ctx.arc(pStart.x, pStart.y, 4 + chargeRatio * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D) {
  const p = state.player;
  const proj = project2DPoint(p.x, p.y);

  ctx.save();
  ctx.translate(proj.x, proj.y);

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

  // ⚔️ 시해(始解) 각성 참백도 영압 회전 오라 링
  if (state.shikai) {
    const rot = (Date.now() / 500) % (Math.PI * 2);
    ctx.save();
    ctx.rotate(rot);
    ctx.strokeStyle = state.shikai.color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = state.shikai.color;
    ctx.shadowBlur = 18;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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

function drawSingleEnemy(ctx: CanvasRenderingContext2D, enemy: any) {
  const proj = project2DPoint(enemy.x, enemy.y);

  ctx.save();
  ctx.translate(proj.x, proj.y);

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
    // 📌 중거리형: ▲ 세모 (Triangle) - 돌진(charging, action) 시에만 lockedAngle 조준 방향 유지, 그 외엔 실시간 플레이어 주시!
    const isDashing = enemy.state === 'charging' || enemy.state === 'action';
    const rot = (isDashing && enemy.lockedAngle !== undefined)
      ? enemy.lockedAngle
      : Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);

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

function drawSingleExpGem(ctx: CanvasRenderingContext2D, gem: any) {
  const proj = project2DPoint(gem.x, gem.y);

  ctx.save();
  ctx.translate(proj.x, proj.y);
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

function drawAttacks(ctx: CanvasRenderingContext2D) {
  for (const atk of state.attacks) {
    const proj = project2DPoint(atk.x, atk.y);

    ctx.save();
    ctx.translate(proj.x, proj.y);
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
    const pProj = project2DPoint(proj.x, proj.y);

    ctx.save();

    // 1. 잔상 잔류 궤적 (Motion Trail)
    const norm = Math.hypot(proj.vx, proj.vy) || 1;
    const dirX = proj.vx / norm;
    const dirY = proj.vy / norm;

    for (let k = 1; k <= 3; k++) {
      const trailP = project2DPoint(proj.x - dirX * k * 8, proj.y - dirY * k * 8);
      ctx.save();
      ctx.translate(trailP.x, trailP.y);
      ctx.globalAlpha = 0.5 - k * 0.12;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(3, proj.radius - k * 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. 메인 세로 투사체 구체 (강렬한 청록/에메랄드 글로우 & 하얀 고열 핵)
    ctx.translate(pProj.x, pProj.y);
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
    const proj = project2DPoint(gem.x, gem.y);

    ctx.save();
    ctx.translate(proj.x, proj.y);
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

    const proj = project2DPoint(img.x, img.y);
    const alpha = img.life / img.maxLife;

    ctx.save();
    ctx.translate(proj.x, proj.y);
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

    const proj = project2DPoint(pt.x, pt.y);

    ctx.save();
    ctx.globalAlpha = pt.life / pt.maxLife;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, pt.size, 0, Math.PI * 2);
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

    const proj = project2DPoint(txt.x, txt.y);

    ctx.save();
    ctx.globalAlpha = txt.life / txt.maxLife;
    ctx.font = 'bold 15px Pretendard, sans-serif';
    ctx.fillStyle = txt.color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'center';
    ctx.fillText(txt.text, proj.x, proj.y);
    ctx.restore();
  }
}
