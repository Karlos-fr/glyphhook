export type Vec2 = { x: number; y: number };

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const approach = (v: number, target: number, delta: number) => v < target ? Math.min(target, v + delta) : v > target ? Math.max(target, v - delta) : v;
export const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const mod = (v: number, m: number) => ((v % m) + m) % m;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dirDot = (ax: number, ay: number, bx: number, by: number) => {
  const a = Math.hypot(ax, ay), b = Math.hypot(bx, by);
  return a && b ? (ax * bx + ay * by) / (a * b) : 1;
};
