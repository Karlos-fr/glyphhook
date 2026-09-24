import { PHYSICS as P } from '../config/physics';
import { dist, lerp, mod, type Vec2 } from '../engine/math';
import type { Player } from '../gameplay/player';
import { tileAt, type World } from '../gameplay/world';
import type { GhostPoint, Settings } from '../storage';

const BASE = {
  bg: '#080b0d',
  wall: '#46505a',
  wall2: '#303841',
  player: '#d6dfd7',
  anchor: '#b89b63',
  anchorTarget: '#d8c48e',
  hazard: '#a9574d',
  checkpoint: '#7f9d87',
  exit: '#8d829d',
  rope: '#786b52',
  bubble: '#829aa6',
  ui: '#b5bec4',
  dim: '#68737b',
  star: '#161c20',
  aim: '#69737b',
  ghost: 'rgba(214,223,215,.16)',
  text: '#7e8990',
  particle: '#c3c9cc',
};
const HIGH = {
  ...BASE,
  bg: '#020303',
  wall: '#737f89',
  wall2: '#4d5962',
  player: '#eef2ee',
  anchor: '#d0b577',
  anchorTarget: '#ead7a1',
  hazard: '#c36e62',
  checkpoint: '#9eb7a3',
  exit: '#aaa0b7',
  ui: '#d7dde0',
  dim: '#98a3aa',
  aim: '#d1d6d9',
  text: '#c5cdd1',
};
const LEVEL_BASE = {
  bg: '#030609',
  wall: '#39458f',
  wall2: '#1b2358',
  player: '#31ff6a',
  anchor: '#ffd969',
  anchorTarget: '#fff2a9',
  hazard: '#ff5858',
  checkpoint: '#61ff98',
  exit: '#c563ff',
  rope: '#d6945e',
  bubble: '#58ebff',
  ui: '#42d9ff',
  dim: '#39545c',
  star: '#17232f',
  aim: '#657581',
  ghost: 'rgba(49,255,106,.28)',
  text: '#6d8892',
  particle: '#c9f8ff',
};
const LEVEL_HIGH = {
  ...LEVEL_BASE,
  bg: '#000000',
  wall: '#6577ff',
  wall2: '#3243b8',
  player: '#54ff72',
  anchor: '#ffe14a',
  anchorTarget: '#fff2a9',
  hazard: '#ff3c3c',
  checkpoint: '#68ffb1',
  exit: '#f184ff',
  ui: '#64efff',
  dim: '#8da0a8',
  aim: '#d0d8dc',
  text: '#b7c8cd',
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; glyph: string; color: string };
type TrailPoint = { x: number; y: number; life: number };

export class AsciiRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private zoom = 1;
  private worldPixels: Vec2 = { x: 1098, y: 612 };
  private worldOffset: Vec2 = { x: 0, y: 0 };
  screen: Vec2 = { x: 0, y: 0 };
  view: Vec2 = { x: 0, y: 0 };
  private stars: Vec2[];
  private particles: Particle[] = [];
  private trail: TrailPoint[] = [];
  private shakePower = 0;
  private time = 0;
  private fps = 60;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.ctx = ctx;
    this.stars = this.makeStars();
    this.resize();
  }

  setWorldSize(width: number, height: number) {
    this.worldPixels = { x: width, y: height };
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.screen = { x: Math.max(320, r.width), y: Math.max(240, r.height) };
    this.zoom = Math.max(
      0.45,
      Math.min(this.screen.x / this.worldPixels.x, this.screen.y / this.worldPixels.y),
    );
    this.view = { x: this.screen.x / this.zoom, y: this.screen.y / this.zoom };
    this.worldOffset = {
      x: Math.max(0, (this.view.x - this.worldPixels.x) / 2),
      y: Math.max(0, (this.view.y - this.worldPixels.y) / 2),
    };
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.screen.x * this.dpr);
    this.canvas.height = Math.round(this.screen.y * this.dpr);
  }

  screenToView(p: Vec2): Vec2 {
    return {
      x: p.x / this.zoom - this.worldOffset.x,
      y: p.y / this.zoom - this.worldOffset.y,
    };
  }

  kickShake(power: number, settings: Settings) {
    if (!settings.reducedMotion && settings.screenShake) this.shakePower = Math.max(this.shakePower, power);
  }

  burst(pos: Vec2, color: string, count: number, speed: number, settings: Settings, glyph = '·') {
    if (settings.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.45;
      const force = speed * (0.55 + Math.random() * 0.55);
      this.particles.push({
        x: pos.x, y: pos.y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        life: 0.35 + Math.random() * 0.25,
        max: 0.6,
        glyph,
        color,
      });
    }
  }

  stepEffects(dt: number, player: Player, settings: Settings) {
    this.time += dt;
    const instantFps = dt > 0 ? 1 / dt : 60;
    this.fps += (instantFps - this.fps) * 0.08;
    this.shakePower = Math.max(0, this.shakePower - dt * 24);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.vx *= 0.985;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    if (!settings.reducedMotion && player.speed > P.highSpeedTrail) {
      this.trail.push({ x: player.pos.x, y: player.pos.y, life: 0.22 });
    }
    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter((t) => t.life > 0).slice(-18);
  }

  render(
    world: World,
    player: Player,
    camera: Vec2,
    aim: Vec2,
    runMs: number,
    bestMs: number | undefined,
    settings: Settings,
    ghost: GhostPoint[] | undefined,
    clearText = '',
    introText = '',
    campaignText = '',
  ) {
    const C = settings.highContrast ? HIGH : BASE;
    const W = settings.highContrast ? LEVEL_HIGH : LEVEL_BASE;
    const g = this.ctx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = W.bg;
    g.fillRect(0, 0, this.screen.x, this.screen.y);
    this.drawSignalTexture(g, C);

    const shake = this.shakePower > 0 && !settings.reducedMotion
      ? { x: (Math.random() - 0.5) * this.shakePower, y: (Math.random() - 0.5) * this.shakePower }
      : { x: 0, y: 0 };

    g.save();
    g.setTransform(this.dpr * this.zoom, 0, 0, this.dpr * this.zoom, shake.x * this.dpr, shake.y * this.dpr);
    g.translate(
      this.worldOffset.x - Math.round(camera.x),
      this.worldOffset.y - Math.round(camera.y),
    );
    this.drawStars(g, camera, C);
    this.drawWorld(g, world, camera, player, W);
    this.drawHookGuide(g, player, W);
    if (settings.ghost && ghost?.length) this.drawGhost(g, ghost, runMs, W);
    this.drawTrail(g, W);
    this.drawRope(g, player, W);
    this.drawParticles(g);
    this.drawBubble(g, player, W);
    this.drawPlayer(g, player, W);
    g.restore();

    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawAim(g, aim, W);
    if (settings.speedrunHud) this.drawHud(g, world, player, runMs, bestMs, campaignText, C);
    if (settings.debugOverlay) this.drawDebug(g, player, C);
    if (introText) this.drawCenterText(g, introText, C.ui, 16, this.screen.y * 0.22);
    if (clearText) this.drawCenterText(g, clearText, W.player, 22, this.screen.y * 0.5);
  }

  private drawWorld(g: CanvasRenderingContext2D, world: World, camera: Vec2, player: Player, C: typeof BASE) {
    g.font = `bold ${P.cell}px ui-monospace,Menlo,Consolas,monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const x0 = Math.max(0, Math.floor(camera.x / P.cell) - 1);
    const x1 = Math.min(world.width - 1, Math.ceil((camera.x + this.view.x) / P.cell) + 1);
    const y0 = Math.max(0, Math.floor(camera.y / P.cell) - 1);
    const y1 = Math.min(world.height - 1, Math.ceil((camera.y + this.view.y) / P.cell) + 1);

    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const tile = tileAt(world, x, y);
      const p = { x: x * P.cell + P.cell / 2, y: y * P.cell + P.cell / 2 + 1 };
      if (tile === '#') this.glyph(g, '#', p, (x + y) % 2 ? C.wall : C.wall2);
      else if (tile === 'o') {
        const selected = Boolean(player.candidateAnchor && dist(player.candidateAnchor, p) < 2);
        this.glyph(g, selected ? '◎' : 'O', p, selected ? C.anchorTarget : C.anchor, selected);
      }
      else if (tile === '^') this.glyph(g, '^', p, C.hazard);
      else if (tile === '!') {
        const checkpointIndex = world.checkpoints.findIndex((cp) => dist(cp, p) < 2);
        const active = checkpointIndex >= 0 && checkpointIndex === player.checkpointIndex;
        this.glyph(g, active ? '✓' : '!', p, C.checkpoint, active);
      }
      else if (tile === 'E') this.glyph(g, 'E', p, C.exit, true);
      else if (tile !== '.' && tile !== '@') this.glyph(g, tile, p, C.text);
    }
  }

  private drawHookGuide(g: CanvasRenderingContext2D, player: Player, C: typeof BASE) {
    g.save();
    g.globalAlpha = 0.08;
    g.strokeStyle = C.anchor;
    g.lineWidth = 1;
    g.setLineDash([5, 8]);
    g.beginPath();
    g.arc(player.pos.x, player.pos.y, P.hookRange, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);

    if (player.candidateAnchor && !player.anchor) {
      g.globalAlpha = 0.34;
      g.strokeStyle = C.anchorTarget;
      g.setLineDash([2, 6]);
      g.beginPath();
      g.arc(player.candidateAnchor.x, player.candidateAnchor.y, 13, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
    g.restore();
  }

  private drawRope(g: CanvasRenderingContext2D, player: Player, C: typeof BASE) {
    if (!player.anchor) return;
    const points = [player.pos, ...player.ropePoints];
    g.font = '11px monospace';
    g.fillStyle = C.rope;
    for (let s = 0; s < points.length - 1; s++) {
      const a = points[s], b = points[s + 1];
      const n = Math.max(2, Math.floor(dist(a, b) / 9));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        g.fillText((i + s) % 2 ? '·' : '-', lerp(a.x, b.x, t), lerp(a.y, b.y, t));
      }
    }
    for (const pivot of player.ropePivots) this.glyph(g, '+', pivot, C.rope, true);
  }

  private drawTrail(g: CanvasRenderingContext2D, C: typeof BASE) {
    g.font = `bold ${P.cell}px monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const t of this.trail) {
      g.globalAlpha = Math.max(0, t.life / 0.22) * 0.22;
      g.fillStyle = C.player;
      g.fillText('@', t.x, t.y);
    }
    g.globalAlpha = 1;
  }

  private drawParticles(g: CanvasRenderingContext2D) {
    g.font = 'bold 13px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const p of this.particles) {
      g.globalAlpha = Math.min(1, p.life / p.max);
      g.fillStyle = p.color;
      g.fillText(p.glyph, p.x, p.y);
    }
    g.globalAlpha = 1;
  }

  private drawBubble(g: CanvasRenderingContext2D, player: Player, C: typeof BASE) {
    if (player.bubbleFx <= 0) return;
    const q = player.bubbleFx / 0.25;
    g.font = `bold ${P.cell}px monospace`;
    g.fillStyle = C.bubble;
    g.fillText('□', player.bubblePos.x, player.bubblePos.y + (1 - q) * 12);
  }

  private drawPlayer(g: CanvasRenderingContext2D, player: Player, C: typeof BASE) {
    const bob = player.grounded ? 0 : Math.sin(this.time * 18) * 0.5;
    const glyph = player.anchor ? '@' : player.speed > P.highSpeedTrail ? '＠' : '@';
    this.glyph(g, glyph, { x: player.pos.x, y: player.pos.y + bob }, C.player, true);
  }

  private drawGhost(g: CanvasRenderingContext2D, ghost: GhostPoint[], runMs: number, C: typeof BASE) {
    let i = 1;
    while (i < ghost.length && ghost[i].t < runMs) i++;
    if (i >= ghost.length) return;
    const a = ghost[Math.max(0, i - 1)], b = ghost[i];
    const u = b.t === a.t ? 0 : (runMs - a.t) / (b.t - a.t);
    g.font = `bold ${P.cell}px monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = C.ghost;
    g.fillText('@', lerp(a.x, b.x, u), lerp(a.y, b.y, u));
  }

  private drawAim(g: CanvasRenderingContext2D, aim: Vec2, C: typeof BASE) {
    const x = (aim.x + this.worldOffset.x) * this.zoom;
    const y = (aim.y + this.worldOffset.y) * this.zoom;
    g.strokeStyle = C.aim;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x - 6, y); g.lineTo(x + 6, y);
    g.moveTo(x, y - 6); g.lineTo(x, y + 6);
    g.stroke();
  }

  private drawHud(
    g: CanvasRenderingContext2D,
    world: World,
    player: Player,
    runMs: number,
    bestMs: number | undefined,
    campaignText: string,
    C: typeof BASE,
  ) {
    g.font = 'bold 12px ui-monospace,Menlo,Consolas,monospace';
    g.textBaseline = 'top';
    g.textAlign = 'left';
    g.fillStyle = C.ui;
    g.fillText(world.def.name, 14, 12);

    g.fillStyle = C.dim;
    g.fillText(world.def.mechanic, 14, 30);

    if (!player.bubbleReady) {
      const pct = Math.round((1 - player.bubbleCooldown / P.bubbleCooldown) * 100);
      g.fillText(`BUBBLE RECOVERY ${pct}%`, 14, 48);
    } else if (campaignText) {
      g.fillText(campaignText, 14, 48);
    }

    g.textAlign = 'right';
    g.fillStyle = C.ui;
    g.fillText(
      `${formatMs(runMs)}${bestMs !== undefined ? `  BEST ${formatMs(bestMs)}` : ''}  ×${player.deaths}`,
      this.screen.x - 14,
      12,
    );
  }

  private drawDebug(g: CanvasRenderingContext2D, player: Player, C: typeof BASE) {
    const x = 14;
    const y = this.screen.y - 94;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = '11px ui-monospace,Menlo,Consolas,monospace';
    g.fillStyle = 'rgba(3,6,9,.78)';
    g.fillRect(x - 7, y - 7, 280, 88);
    g.fillStyle = C.ui;
    const anchor = player.anchor ? `${Math.round(player.anchor.x)},${Math.round(player.anchor.y)}` : 'none';
    const lines = [
      `FPS ${this.fps.toFixed(0)}   POS ${player.pos.x.toFixed(1)}, ${player.pos.y.toFixed(1)}`,
      `VEL ${player.vel.x.toFixed(1)}, ${player.vel.y.toFixed(1)}   SPEED ${player.speed.toFixed(1)}`,
      `ROPE ${player.ropeLength.toFixed(1)}   PIVOTS ${player.ropePivots.length}`,
      `ANCHOR ${anchor}   GROUNDED ${player.grounded ? 'yes' : 'no'}`,
    ];
    lines.forEach((line, index) => g.fillText(line, x, y + index * 18));
  }

  private drawSignalTexture(g: CanvasRenderingContext2D, C: typeof BASE) {
    g.save();

    g.globalAlpha = 0.028;
    g.fillStyle = C.ui;
    for (let y = 1; y < this.screen.y; y += 4) {
      g.fillRect(0, y, this.screen.x, 1);
    }

    g.globalAlpha = 0.022;
    const drift = Math.floor(this.time * 13);
    for (let i = 0; i < 72; i++) {
      const x = (i * 137 + drift * 17) % Math.max(1, Math.floor(this.screen.x));
      const y = (i * 71 + drift * 7) % Math.max(1, Math.floor(this.screen.y));
      g.fillRect(x, y, 1, 1);
    }

    g.globalAlpha = 0.045;
    g.fillStyle = C.dim;
    g.fillRect(0, this.screen.y - 1, this.screen.x, 1);

    g.restore();
  }

  private drawStars(g: CanvasRenderingContext2D, camera: Vec2, C: typeof BASE) {
    g.font = '12px monospace';
    g.fillStyle = C.star;
    const width = this.view.x + 30;
    const height = this.view.y + 30;
    for (const s of this.stars) {
      g.fillText('.', camera.x + mod(s.x - camera.x * 0.08, width) - 15, camera.y + mod(s.y - camera.y * 0.08, height) - 15);
    }
  }

  private drawCenterText(g: CanvasRenderingContext2D, text: string, color: string, size: number, y: number) {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `bold ${size}px ui-monospace,Menlo,Consolas,monospace`;
    g.fillStyle = color;
    g.fillText(text, this.screen.x / 2, y);
  }

  private glyph(g: CanvasRenderingContext2D, ch: string, p: Vec2, color: string, glow = false) {
    g.fillStyle = color;
    if (glow) { g.shadowColor = color; g.shadowBlur = 2; }
    g.fillText(ch, p.x, p.y);
    if (glow) g.shadowBlur = 0;
  }

  private makeStars() {
    let s = 0x47594c50;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
    return Array.from({ length: 150 }, () => ({ x: rnd() * 2200, y: rnd() * 1300 }));
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
