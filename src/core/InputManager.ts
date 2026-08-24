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

export function setupKeyboardListeners() {
  window.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
    keysPressed[e.code] = true;

    // 한글 입력기 (IME) 키버튼 매핑 ('ㅈ', 'ㄴ', 'ㅁ', 'ㅇ')
    if (e.key === 'ㅈ' || e.key === 'ㅈ') keysPressed['w'] = true;
    if (e.key === 'ㄴ' || e.key === 'ㄴ') keysPressed['s'] = true;
    if (e.key === 'ㅁ' || e.key === 'ㅁ') keysPressed['a'] = true;
    if (e.key === 'ㅇ' || e.key === 'ㅇ') keysPressed['d'] = true;

    if ((e.code === 'Space' || e.key === ' ') && state.screen === 'battle' && !state.isPaused && !state.isGameOver) {
      e.preventDefault();
      triggerShunpo();
    }
  });

  window.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
    keysPressed[e.code] = false;

    if (e.key === 'ㅈ' || e.key === 'ㅈ') keysPressed['w'] = false;
    if (e.key === 'ㄴ' || e.key === 'ㄴ') keysPressed['s'] = false;
    if (e.key === 'ㅁ' || e.key === 'ㅁ') keysPressed['a'] = false;
    if (e.key === 'ㅇ' || e.key === 'ㅇ') keysPressed['d'] = false;
  });

  window.addEventListener('blur', () => {
    resetKeys();
  });
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
