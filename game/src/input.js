// Keyboard and mouse input. Held keys steer and drive; one-shot presses (enter car,
// shoot, pause, start mission) are queued as flags and taken once by the loop.
import { STEP } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_SHOOT = 8;
export const ACTION_MISSION = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const MISSION = new Set(['KeyM']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;

  window.addEventListener('keydown', (event) => {
    held.add(event.code);
    if (event.repeat) return;
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (ENTER.has(event.code)) actions |= ACTION_ENTER;
    else if (MISSION.has(event.code)) actions |= ACTION_MISSION;
    else if (event.code === 'KeyF') actions |= ACTION_SHOOT;
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || event.code === 'Space') {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', () => { actions |= ACTION_SHOOT; });

  function has(set) { for (const k of set) if (held.has(k)) return true; return false; }

  return {
    /** Driving / walking intent this frame: up, down, steer (-1..1), run. */
    read() {
      const steer = (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
      return {
        up: has(UP), down: has(DOWN), steer,
        run: has(RUN),
        forward: (has(UP) ? 1 : 0) - (has(DOWN) ? 1 : 0),
        strafe: steer,
      };
    },
    mouse() { return { x: mouseX, y: mouseY }; },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
