import type { Input, Action } from './input';

const BUTTONS: Array<[number, Action]> = [
  [0, 'jump'],
  [2, 'bubble'],
  [6, 'in'],
  [7, 'hook'],
  [5, 'out'],
];

export class GamepadController {
  private connected = false;

  update(input: Input, viewWidth: number, viewHeight: number) {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = Array.from(pads).find((p): p is Gamepad => Boolean(p?.connected));
    if (!pad) {
      if (this.connected) input.clearSource('gamepad');
      input.gamepadAnalogX = 0;
      this.connected = false;
      return;
    }

    this.connected = true;
    const dead = (v: number) => Math.abs(v) < 0.14 ? 0 : v;
    input.gamepadAnalogX = dead(pad.axes[0] ?? 0);

    for (const [index, action] of BUTTONS) {
      input.set(action, Boolean(pad.buttons[index]?.pressed), 'gamepad');
    }

    const rx = dead(pad.axes[2] ?? 0);
    const ry = dead(pad.axes[3] ?? 0);
    if (Math.hypot(rx, ry) > 0.18) {
      input.aim = {
        x: viewWidth * 0.5 + rx * Math.min(300, viewWidth * 0.33),
        y: viewHeight * 0.5 + ry * Math.min(220, viewHeight * 0.33),
      };
      input.aimed = true;
    }
  }
}
