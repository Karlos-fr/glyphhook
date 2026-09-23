import { PHYSICS as P } from '../config/physics';
import { dist, type Vec2 } from '../engine/math';
import type { LevelDef } from '../levels/index';

export type World = {
  def: LevelDef;
  grid: string[][];
  width: number;
  height: number;
  start: Vec2;
  exit: Vec2;
  anchors: Vec2[];
  checkpoints: Vec2[];
};

export type TileHit = { x: number; y: number; point: Vec2 };

export function makeWorld(def: LevelDef): World {
  const width = Math.max(...def.rows.map((r) => r.length));
  const height = def.rows.length;
  const grid = def.rows.map((r) => r.padEnd(width, '.').split(''));
  const anchors: Vec2[] = [];
  const checkpoints: Vec2[] = [];
  let start: Vec2 | undefined;
  let exit: Vec2 | undefined;

  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const tile = grid[y][x];
    const p = { x: x * P.cell + P.cell / 2, y: y * P.cell + P.cell / 2 };
    if (tile === '@') start = p;
    else if (tile === 'E') exit = p;
    else if (tile === 'o') anchors.push(p);
    else if (tile === '!') checkpoints.push(p);
  }
  if (!start || !exit) throw new Error(`Level ${def.id} needs @ and E`);
  return { def, grid, width, height, start, exit, anchors, checkpoints };
}

export function tileAt(world: World, x: number, y: number) {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return '#';
  return world.grid[y][x];
}

export function firstSolidOnSegment(world: World, a: Vec2, b: Vec2): TileHit | null {
  const length = dist(a, b);
  if (length < 8) return null;
  const steps = Math.max(2, Math.ceil(length / 3));
  const grace = Math.min(0.08, 4 / length);
  let lastX = Number.NaN;
  let lastY = Number.NaN;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (t < grace || t > 1 - grace) continue;
    const px = a.x + (b.x - a.x) * t;
    const py = a.y + (b.y - a.y) * t;
    const x = Math.floor(px / P.cell);
    const y = Math.floor(py / P.cell);
    if (x === lastX && y === lastY) continue;
    lastX = x; lastY = y;
    if (tileAt(world, x, y) === '#') return { x, y, point: { x: px, y: py } };
  }
  return null;
}

export function lineClear(world: World, a: Vec2, b: Vec2) {
  return firstSolidOnSegment(world, a, b) === null;
}

export function bestWrapCorner(world: World, hit: TileHit, from: Vec2, to: Vec2): Vec2 {
  const x0 = hit.x * P.cell;
  const y0 = hit.y * P.cell;
  const x1 = x0 + P.cell;
  const y1 = y0 + P.cell;
  const o = P.ropeCornerOffset;
  const candidates: Vec2[] = [
    { x: x0 - o, y: y0 - o },
    { x: x1 + o, y: y0 - o },
    { x: x0 - o, y: y1 + o },
    { x: x1 + o, y: y1 + o },
  ];
  candidates.sort((a, b) => (dist(from, a) + dist(a, to)) - (dist(from, b) + dist(b, to)));
  return candidates.find((c) => lineClear(world, from, c) && lineClear(world, c, to)) ?? candidates[0];
}
