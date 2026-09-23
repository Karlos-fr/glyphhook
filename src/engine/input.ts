import type { Vec2 } from './math';

export type Action = 'left' | 'right' | 'jump' | 'hook' | 'bubble' | 'in' | 'out';

export class Input {
  readonly down = new Set<Action>();
  readonly pressed = new Set<Action>();
  aim: Vec2 = { x: 0, y: 0 };
  aimed = false;
  analogX = 0;

  set(action: Action, value: boolean) {
    if (value) {
      if (!this.down.has(action)) this.pressed.add(action);
      this.down.add(action);
    } else {
      this.down.delete(action);
    }
  }

  has(action: Action) { return this.down.has(action); }
  take(action: Action) {
    const value = this.pressed.has(action);
    this.pressed.delete(action);
    return value;
  }
  clearTransient() { this.pressed.clear(); }
}
