import type { Vec2 } from './math';

export type Action = 'left' | 'right' | 'jump' | 'hook' | 'bubble' | 'in' | 'out';
export type InputSource = 'keyboard' | 'pointer' | 'gamepad';

export class Input {
  private readonly sources: Record<InputSource, Set<Action>> = {
    keyboard: new Set<Action>(),
    pointer: new Set<Action>(),
    gamepad: new Set<Action>(),
  };
  readonly pressed = new Set<Action>();
  aim: Vec2 = { x: 0, y: 0 };
  aimed = false;
  touchAnalogX = 0;
  gamepadAnalogX = 0;

  get analogX() {
    return Math.abs(this.gamepadAnalogX) > 0.12 ? this.gamepadAnalogX : this.touchAnalogX;
  }

  set(action: Action, value: boolean, source: InputSource = 'keyboard') {
    const before = this.has(action);
    if (value) this.sources[source].add(action);
    else this.sources[source].delete(action);
    if (!before && this.has(action)) this.pressed.add(action);
  }

  has(action: Action) {
    return this.sources.keyboard.has(action) || this.sources.pointer.has(action) || this.sources.gamepad.has(action);
  }

  take(action: Action) {
    const value = this.pressed.has(action);
    this.pressed.delete(action);
    return value;
  }

  clearSource(source: InputSource) {
    this.sources[source].clear();
  }

  clearTransient() {
    this.pressed.clear();
  }
}
