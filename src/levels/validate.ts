import { PHYSICS } from '../config/physics';
import { LEVEL_HEIGHT, LEVEL_WIDTH, type LevelDef } from './index';

export function validateLevels(levels: LevelDef[]) {
  const ids = new Set<string>();
  for (const level of levels) {
    if (ids.has(level.id)) throw new Error(`Duplicate level id: ${level.id}`);
    ids.add(level.id);
    if (!level.rows.length) throw new Error(`Level ${level.id} has no rows`);
    const flat = level.rows.join('');
    const starts = [...flat].filter((c) => c === '@').length;
    const exits = [...flat].filter((c) => c === 'E').length;
    if (starts !== 1) throw new Error(`Level ${level.id} must contain exactly one @ start (found ${starts})`);
    if (exits !== 1) throw new Error(`Level ${level.id} must contain exactly one E exit (found ${exits})`);
    if (level.parMs <= 0) throw new Error(`Level ${level.id} has an invalid par time`);
    if (level.rows.length !== LEVEL_HEIGHT) {
      throw new Error(`Level ${level.id} must be ${LEVEL_HEIGHT} rows high (found ${level.rows.length})`);
    }
    const badRow = level.rows.findIndex((row) => row.length !== LEVEL_WIDTH);
    if (badRow >= 0) {
      throw new Error(
        `Level ${level.id} row ${badRow} must be ${LEVEL_WIDTH} columns wide (found ${level.rows[badRow].length})`,
      );
    }

    const cell = PHYSICS.cell;
    const points = { start: null as { x: number; y: number } | null, anchors: [] as { x: number; y: number }[] };
    for (let y = 0; y < level.rows.length; y++) {
      for (let x = 0; x < level.rows[y].length; x++) {
        const tile = level.rows[y][x];
        const point = { x: x * cell + cell / 2, y: y * cell + cell / 2 };
        if (tile === '@') points.start = point;
        else if (tile === 'o') points.anchors.push(point);
      }
    }

    if (points.start && points.anchors.length) {
      const nearest = Math.min(
        ...points.anchors.map((anchor) =>
          Math.hypot(anchor.x - points.start!.x, anchor.y - points.start!.y),
        ),
      );
      if (nearest > PHYSICS.hookRange) {
        throw new Error(
          `Level ${level.id} has no starting anchor within hook range (${nearest.toFixed(1)} > ${PHYSICS.hookRange})`,
        );
      }
    }
  }
}
