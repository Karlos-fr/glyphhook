export const LEVEL_WIDTH = 64;
export const LEVEL_HEIGHT = 36;

export type LevelDef = {
  id: string;
  name: string;
  subtitle: string;
  mechanic: string;
  parMs: number;
  training?: boolean;
  rows: string[];
};

type Grid = string[][];

function room(draw: (grid: Grid) => void): string[] {
  const grid = Array.from({ length: LEVEL_HEIGHT }, () => Array.from({ length: LEVEL_WIDTH }, () => '.'));

  for (let x = 0; x < LEVEL_WIDTH; x++) {
    grid[0][x] = '#';
    grid[LEVEL_HEIGHT - 1][x] = '#';
  }
  for (let y = 0; y < LEVEL_HEIGHT; y++) {
    grid[y][0] = '#';
    grid[y][LEVEL_WIDTH - 1] = '#';
  }

  draw(grid);
  return grid.map((row) => row.join(''));
}

function put(grid: Grid, x: number, y: number, tile: string) {
  grid[y][x] = tile;
}

function platform(grid: Grid, x1: number, x2: number, y: number, thickness = 1) {
  for (let yy = y; yy < Math.min(LEVEL_HEIGHT - 1, y + thickness); yy++) {
    for (let x = x1; x <= x2; x++) grid[yy][x] = '#';
  }
}

function lava(grid: Grid, x1: number, x2: number, y = 31) {
  for (let x = x1; x <= x2; x++) grid[y][x] = '^';
}

function anchor(grid: Grid, x: number, y: number) {
  put(grid, x, y, 'o');
}

export const LEVELS: LevelDef[] = [
  {
    id: 'lab',
    name: '00 / MOVEMENT LAB',
    subtitle: 'LEARN THE ARC',
    mechanic: 'RUN · JUMP · HOOK · RELEASE · BUBBLE',
    parMs: 26000,
    training: true,
    rows: room((g) => {
      platform(g, 1, 12, 29, 2);
      platform(g, 27, 35, 25, 2);
      platform(g, 47, 62, 29, 2);
      lava(g, 13, 26);
      lava(g, 36, 46);
      anchor(g, 21, 15);
      anchor(g, 39, 13);
      anchor(g, 52, 18);
      put(g, 6, 28, '@');
      put(g, 9, 28, '!');
      put(g, 60, 28, 'E');
    }),
  },
  {
    id: 'runway',
    name: '01 / RUNWAY',
    subtitle: 'FIND THE RHYTHM',
    mechanic: 'RUN + JUMP',
    parMs: 15000,
    rows: room((g) => {
      platform(g, 1, 10, 29, 2);
      platform(g, 16, 21, 27, 2);
      platform(g, 27, 32, 25, 2);
      platform(g, 38, 43, 27, 2);
      platform(g, 49, 62, 29, 2);
      lava(g, 11, 48);
      put(g, 5, 28, '@');
      put(g, 8, 28, '!');
      put(g, 60, 28, 'E');
    }),
  },
  {
    id: 'first-line',
    name: '02 / FIRST SWING',
    subtitle: 'LET THE ROPE LIFT YOU',
    mechanic: 'HOLD HOOK',
    parMs: 16000,
    rows: room((g) => {
      platform(g, 1, 13, 29, 2);
      platform(g, 21, 31, 23, 2);
      platform(g, 38, 45, 26, 2);
      platform(g, 52, 62, 29, 2);
      lava(g, 14, 20);
      lava(g, 32, 37);
      lava(g, 46, 51);
      anchor(g, 23, 14);
      put(g, 6, 28, '@');
      put(g, 9, 28, '!');
      put(g, 60, 28, 'E');
    }),
  },
  {
    id: 'release',
    name: '03 / RELEASE',
    subtitle: 'LET GO AT THE APEX',
    mechanic: 'HOOK + RELEASE',
    parMs: 18000,
    rows: room((g) => {
      platform(g, 1, 12, 29, 2);
      platform(g, 38, 42, 22, 2);
      platform(g, 50, 62, 28, 2);
      lava(g, 13, 49);
      anchor(g, 24, 13);
      put(g, 6, 28, '@');
      put(g, 9, 28, '!');
      put(g, 60, 27, 'E');
    }),
  },
  {
    id: 'transfer',
    name: '04 / TRANSFER',
    subtitle: 'CARRY THE SPEED',
    mechanic: 'DOUBLE HOOK',
    parMs: 21000,
    rows: room((g) => {
      platform(g, 1, 10, 29, 2);
      platform(g, 28, 31, 25, 2);
      platform(g, 50, 62, 25, 2);
      lava(g, 11, 49);
      anchor(g, 19, 14);
      anchor(g, 35, 13);
      anchor(g, 47, 16);
      put(g, 5, 28, '@');
      put(g, 8, 28, '!');
      put(g, 60, 24, 'E');
    }),
  },
  {
    id: 'bubble',
    name: '05 / BUBBLE',
    subtitle: 'CORRECT THE ARC',
    mechanic: 'BUBBLE',
    parMs: 20000,
    rows: room((g) => {
      platform(g, 1, 12, 29, 2);
      platform(g, 22, 28, 26, 2);
      platform(g, 39, 45, 24, 2);
      platform(g, 52, 62, 29, 2);
      lava(g, 13, 51);
      put(g, 6, 28, '@');
      put(g, 9, 28, '!');
      put(g, 60, 28, 'E');
    }),
  },
  {
    id: 'combo',
    name: '06 / COMBO',
    subtitle: 'HOOK, BUBBLE, RELEASE',
    mechanic: 'HOOK + BUBBLE',
    parMs: 24000,
    rows: room((g) => {
      platform(g, 1, 11, 29, 2);
      platform(g, 29, 34, 24, 2);
      platform(g, 49, 62, 25, 2);
      lava(g, 12, 48);
      anchor(g, 20, 14);
      anchor(g, 40, 12);
      put(g, 5, 28, '@');
      put(g, 8, 28, '!');
      put(g, 60, 24, 'E');
    }),
  },
  {
    id: 'needle',
    name: '07 / NEEDLE',
    subtitle: 'LAND SMALL',
    mechanic: 'PRECISION SWING',
    parMs: 27000,
    rows: room((g) => {
      platform(g, 1, 9, 29, 2);
      platform(g, 25, 27, 23, 2);
      platform(g, 39, 41, 21, 2);
      platform(g, 53, 62, 25, 2);
      lava(g, 10, 52);
      anchor(g, 18, 13);
      anchor(g, 32, 11);
      anchor(g, 46, 13);
      put(g, 5, 28, '@');
      put(g, 7, 28, '!');
      put(g, 60, 24, 'E');
    }),
  },
  {
    id: 'ascent',
    name: '08 / ASCENT',
    subtitle: 'REEL THROUGH THE SIGNAL',
    mechanic: 'VERTICAL CHAIN',
    parMs: 30000,
    rows: room((g) => {
      platform(g, 2, 11, 29, 2);
      platform(g, 13, 19, 25, 2);
      platform(g, 25, 31, 21, 2);
      platform(g, 37, 43, 17, 2);
      platform(g, 25, 31, 13, 2);
      platform(g, 42, 49, 9, 2);
      platform(g, 51, 62, 6, 2);
      lava(g, 12, 59);
      anchor(g, 18, 18);
      anchor(g, 31, 14);
      anchor(g, 44, 10);
      anchor(g, 34, 6);
      anchor(g, 50, 4);
      put(g, 6, 28, '@');
      put(g, 9, 28, '!');
      put(g, 60, 5, 'E');
    }),
  },
  {
    id: 'circuit',
    name: '09 / FINAL CIRCUIT',
    subtitle: 'KEEP THE LINE',
    mechanic: 'FULL SEQUENCE',
    parMs: 36000,
    rows: room((g) => {
      platform(g, 1, 10, 29, 2);
      platform(g, 25, 30, 24, 2);
      platform(g, 38, 42, 20, 2);
      platform(g, 51, 62, 26, 2);
      lava(g, 11, 50);
      anchor(g, 18, 14);
      anchor(g, 34, 11);
      anchor(g, 47, 13);
      put(g, 5, 28, '@');
      put(g, 8, 28, '!');
      put(g, 60, 25, 'E');
    }),
  },
];
