import { PHYSICS } from '../config/physics';
import type { Vec2 } from '../engine/math';
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

export function makeWorld(def: LevelDef): World {
  const width = Math.max(...def.rows.map((r) => r.length));
  const height = def.rows.length;
  const grid = def.rows.map((r) => r.padEnd(width, '.').split(''));
  const anchors: Vec2[] = [];
  const checkpoints: Vec2[] = [];
  let start: Vec2 | undefined;
  let exit: Vec2 | undefined;
  const c = PHYSICS.cell;

  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const tile = grid[y][x];
    const p = { x: x * c + c / 2, y: y * c + c / 2 };
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
