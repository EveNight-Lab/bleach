/**
 * 블리치 사신 서바이벌 - 키보드 및 모바일 터치 조이스틱 입력 관리자
 */

import { state } from './GameState';
import { triggerShunpo } from '../entities/Player';

export const keysPressed: Record<string, boolean> = {};

export interface JoystickData {
  active: boolean;
  angle: number;
  intensity: number;
}

export const joystickState: JoystickData = {
  active: false,
  angle: 0,
  intensity: 0
};

export function resetKeys() {
  for (const k in keysPressed) {
    keysPressed[k] = false;
  }
}

export function restoreWindowFocus() {
  if (typeof document !== 'undefined') {
    if (document.activeElement && (document.activeElement as HTMLElement).blur) {
      (document.activeElement as HTMLElement).blur();
    }
    window.focus();
  }
}

let isInitialized = false;

function handleGlobalKeyDown(e: KeyboardEvent) {
  const code = e.code || '';
  const key = e.key ? e.key.toLowerCase() : '';

  if (code === 'KeyW' || key === 'w' || key === 'w' || key === 'ㅈ' || key === 'ㅉ' || code === 'ArrowUp' || key === 'arrowup' || key === 'up') {
    keysPressed['w'] = true;
  }
  if (code === 'KeyS' || key === 's' || key === 'ㄴ' || code === 'ArrowDown' || key === 'arrowdown' || key === 'down') {
    keysPressed['s'] = true;
  }
  if (code === 'KeyA' || key === 'a' || key === 'ㅁ' || code === 'ArrowLeft' || key === 'arrowleft' || key === 'left') {
    keysPressed['a'] = true;
  }
  if (code === 'KeyD' || key === 'd' || key === 'ㅇ' || code === 'ArrowRight' || key === 'arrowright' || key === 'right') {
    keysPressed['d'] = true;
  }

  if ((code === 'Space' || key === ' ') && state.screen === 'battle' && !state.isPaused && !state.isGameOver) {
    if (e.repeat) return;
    triggerShunpo();
  }
}

function handleGlobalKeyUp(e: KeyboardEvent) {
  const code = e.code || '';
  const key = e.key ? e.key.toLowerCase() : '';

  if (code === 'KeyW' || key === 'w' || key === 'ㅈ' || key === 'ㅉ' || code === 'ArrowUp' || key === 'arrowup' || key === 'up') {
    keysPressed['w'] = false;
  }
  if (code === 'KeyS' || key === 's' || key === 'ㄴ' || code === 'ArrowDown' || key === 'arrowdown' || key === 'down') {
    keysPressed['s'] = false;
  }
  if (code === 'KeyA' || key === 'a' || key === 'ㅁ' || code === 'ArrowLeft' || key === 'arrowleft' || key === 'left') {
    keysPressed['a'] = false;
  }
  if (code === 'KeyD' || key === 'd' || key === 'ㅇ' || code === 'ArrowRight' || key === 'arrowright' || key === 'right') {
    keysPressed['d'] = false;
  }
}

// 📌 모듈 로드 즉시 전역 윈도우 키 이벤트 리스너 자동 등록 (capture: true)
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
  window.addEventListener('keyup', handleGlobalKeyUp, { capture: true });
}

export function setupKeyboardListeners() {
  if (isInitialized) return;
  isInitialized = true;
}

export function updateJoystickVector(dx: number, dy: number, maxRadius: number) {
  const dist = Math.hypot(dx, dy);
  if (dist === 0) {
    joystickState.active = false;
    joystickState.intensity = 0;
  } else {
    joystickState.active = true;
    joystickState.angle = Math.atan2(dy, dx);
    joystickState.intensity = Math.min(1.0, dist / maxRadius);
  }
}

export function resetJoystick() {
  joystickState.active = false;
  joystickState.intensity = 0;
}
