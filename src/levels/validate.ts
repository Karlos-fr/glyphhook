import type { LevelDef } from './index';

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
    const width = Math.max(...level.rows.map((row) => row.length));
    if (width < 12 || level.rows.length < 5) throw new Error(`Level ${level.id} is too small to play safely`);
  }
}
