import { PHYSICS as P } from '../config/physics';
import { dist, lerp, mod, type Vec2 } from '../engine/math';
import type { Player } from '../gameplay/player';
import { tileAt, type World } from '../gameplay/world';
import type { GhostPoint, Settings } from '../storage';

const C = {
  bg: '#030609', wall: '#39458f', wall2: '#1b2358', player: '#31ff6a', anchor: '#ffd969',
  hazard: '#ff5858', checkpoint: '#61ff98', exit: '#c563ff', rope: '#d6945e', bubble: '#58ebff',
  ui: '#42d9ff', dim: '#39545c', star: '#17232f', aim: '#657581', ghost: 'rgba(49,255,106,.28)', text: '#6d8892',
};

export class AsciiRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  view: Vec2 = { x: 0, y: 0 };
  private stars: Vec2[];

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.ctx = ctx;
    this.stars = this.makeStars();
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.view = { x: Math.max(320, r.width), y: Math.max(240, r.height) };
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.view.x * this.dpr);
    this.canvas.height = Math.round(this.view.y * this.dpr);
  }

  render(world: World, player: Player, camera: Vec2, aim: Vec2, runMs: number, bestMs: number | undefined, settings: Settings, ghost: GhostPoint[] | undefined, clearText = '') {
    const g = this.ctx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = C.bg;
    g.fillRect(0, 0, this.view.x, this.view.y);
    this.drawStars(g, camera);

    g.save();
    g.translate(-Math.round(camera.x), -Math.round(camera.y));
    this.drawWorld(g, world, camera);
    if (settings.ghost && ghost?.length) this.drawGhost(g, ghost, runMs);
    this.drawRope(g, player);
    this.drawBubble(g, player);
    this.glyph(g, '@', player.pos, C.player, true);
    g.restore();

    this.drawAim(g, aim);
    if (settings.speedrunHud) this.drawHud(g, world, player, runMs, bestMs);
    if (clearText) {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 22px ui-monospace,Menlo,Consolas,monospace'; g.fillStyle = C.player;
      g.fillText(clearText, this.view.x / 2, this.view.y / 2);
    }
  }

  private drawWorld(g: CanvasRenderingContext2D, world: World, camera: Vec2) {
    g.font = `bold ${P.cell}px ui-monospace,Menlo,Consolas,monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const x0 = Math.max(0, Math.floor(camera.x / P.cell) - 1);
    const x1 = Math.min(world.width - 1, Math.ceil((camera.x + this.view.x) / P.cell) + 1);
    const y0 = Math.max(0, Math.floor(camera.y / P.cell) - 1);
    const y1 = Math.min(world.height - 1, Math.ceil((camera.y + this.view.y) / P.cell) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = tileAt(world, x, y);
      const p = { x: x * P.cell + P.cell / 2, y: y * P.cell + P.cell / 2 + 1 };
      if (t === '#') this.glyph(g, '#', p, (x + y) % 2 ? C.wall : C.wall2);
      else if (t === 'o') this.glyph(g, 'O', p, C.anchor);
      else if (t === '^') this.glyph(g, '^', p, C.hazard);
      else if (t === '!') this.glyph(g, '!', p, C.checkpoint);
      else if (t === 'E') this.glyph(g, 'E', p, C.exit);
      else if (t !== '.' && t !== '@') this.glyph(g, t, p, C.text);
    }
  }

  private drawRope(g: CanvasRenderingContext2D, player: Player) {
    if (!player.anchor) return;
    const n = Math.max(2, Math.floor(dist(player.pos, player.anchor) / 10));
    g.font = '11px monospace'; g.fillStyle = C.rope;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      g.fillText(i % 2 ? '·' : '-', lerp(player.pos.x, player.anchor.x, t), lerp(player.pos.y, player.anchor.y, t));
    }
  }

  private drawBubble(g: CanvasRenderingContext2D, player: Player) {
    if (player.bubbleFx <= 0) return;
    const q = player.bubbleFx / 0.26;
    g.font = `bold ${P.cell}px monospace`; g.fillStyle = C.bubble;
    g.fillText('□', player.bubblePos.x, player.bubblePos.y + (1 - q) * 12);
    g.globalAlpha = Math.max(0, q * 0.65);
    g.fillText('·', player.bubblePos.x - 9, player.bubblePos.y + 4);
    g.fillText('·', player.bubblePos.x + 9, player.bubblePos.y - 3);
    g.globalAlpha = 1;
  }

  private drawGhost(g: CanvasRenderingContext2D, ghost: GhostPoint[], runMs: number) {
    let i = 1;
    while (i < ghost.length && ghost[i].t < runMs) i++;
    if (i >= ghost.length) return;
    const a = ghost[Math.max(0, i - 1)], b = ghost[i];
    const u = b.t === a.t ? 0 : (runMs - a.t) / (b.t - a.t);
    g.font = `bold ${P.cell}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = C.ghost; g.fillText('@', lerp(a.x, b.x, u), lerp(a.y, b.y, u));
  }

  private drawAim(g: CanvasRenderingContext2D, aim: Vec2) {
    g.strokeStyle = C.aim; g.lineWidth = 1;
    g.beginPath(); g.moveTo(aim.x - 5, aim.y); g.lineTo(aim.x + 5, aim.y); g.moveTo(aim.x, aim.y - 5); g.lineTo(aim.x, aim.y + 5); g.stroke();
  }

  private drawHud(g: CanvasRenderingContext2D, world: World, player: Player, runMs: number, bestMs?: number) {
    g.font = 'bold 12px ui-monospace,Menlo,Consolas,monospace'; g.textBaseline = 'top'; g.textAlign = 'left';
    g.fillStyle = C.ui;
    g.fillText(`A/D MOVE  SPACE JUMP  ${player.anchor ? '[HOOK]' : ' HOOK '}  ${player.bubbleReady ? 'BUBBLE' : '.....'}`, 14, 12);
    g.fillStyle = C.dim; g.fillText(world.def.name, 14, 30);
    g.textAlign = 'right';
    g.fillText(`${formatMs(runMs)}${bestMs !== undefined ? `  BEST ${formatMs(bestMs)}` : ''}  ×${player.deaths}`, this.view.x - 14, 12);
  }

  private drawStars(g: CanvasRenderingContext2D, camera: Vec2) {
    g.font = '12px monospace'; g.fillStyle = C.star;
    for (const s of this.stars) g.fillText('.', mod(s.x - camera.x * 0.08, this.view.x + 30) - 15, mod(s.y - camera.y * 0.08, this.view.y + 30) - 15);
  }

  private glyph(g: CanvasRenderingContext2D, ch: string, p: Vec2, color: string, glow = false) {
    g.fillStyle = color;
    if (glow) { g.shadowColor = color; g.shadowBlur = 7; }
    g.fillText(ch, p.x, p.y);
    if (glow) g.shadowBlur = 0;
  }

  private makeStars() {
    let s = 0x47594c50;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
    return Array.from({ length: 120 }, () => ({ x: rnd() * 1800, y: rnd() * 1000 }));
  }
}

export function formatMs(ms: number) {
  const total = Math.max(0, Math.round(ms));
  const min = Math.floor(total / 60000);
  const sec = Math.floor((total % 60000) / 1000);
  const milli = total % 1000;
  return `${min}:${sec.toString().padStart(2, '0')}.${milli.toString().padStart(3, '0')}`;
}

export function rankFor(ms: number, parMs: number) {
  if (ms <= parMs) return 'S';
  if (ms <= parMs * 1.2) return 'A';
  if (ms <= parMs * 1.5) return 'B';
  return 'C';
}
