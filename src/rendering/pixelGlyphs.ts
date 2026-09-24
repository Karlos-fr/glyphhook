import type { Vec2 } from '../engine/math';

type Pattern = readonly string[];

const GLYPHS: Record<string, Pattern> = {
  '#': [
    '0101010',
    '0101010',
    '1111111',
    '0101010',
    '0101010',
    '1111111',
    '0101010',
    '0101010',
    '0101010',
  ],
  '@': [
    '0111110',
    '1100011',
    '1001111',
    '1011001',
    '1011011',
    '1011011',
    '1001111',
    '1100000',
    '0111110',
  ],
  'O': [
    '0011100',
    '0110110',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '0110110',
    '0011100',
  ],
  '^': [
    '0000000',
    '0000000',
    '0000000',
    '0001000',
    '0010100',
    '0100010',
    '1000001',
    '0000000',
    '0000000',
  ],
  '!': [
    '0011100',
    '0011100',
    '0011100',
    '0011100',
    '0011100',
    '0011100',
    '0000000',
    '0011100',
    '0011100',
  ],
  'E': [
    '1111111',
    '1100000',
    '1100000',
    '1111110',
    '1100000',
    '1100000',
    '1100000',
    '1100000',
    '1111111',
  ],
  '□': [
    '0111110',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '0111110',
  ],
  '+': [
    '0000000',
    '0001000',
    '0001000',
    '0011100',
    '0001000',
    '0001000',
    '0000000',
    '0000000',
    '0000000',
  ],
};

export function hasPixelGlyph(ch: string) {
  return Boolean(GLYPHS[ch]);
}

export function drawPixelGlyph(
  g: CanvasRenderingContext2D,
  ch: string,
  p: Vec2,
  color: string,
  glow = false,
) {
  const pattern = GLYPHS[ch];
  if (!pattern) return false;

  const scale = 2;
  const width = pattern[0].length * scale;
  const height = pattern.length * scale;
  const x0 = Math.round(p.x - width / 2);
  const y0 = Math.round(p.y - height / 2);

  g.save();
  g.fillStyle = color;
  if (glow) {
    g.shadowColor = color;
    g.shadowBlur = 6;
  }

  for (let y = 0; y < pattern.length; y++) {
    const row = pattern[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '1') g.fillRect(x0 + x * scale, y0 + y * scale, scale, scale);
    }
  }

  g.restore();
  return true;
}
