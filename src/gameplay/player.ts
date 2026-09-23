import { PHYSICS as P } from '../config/physics';
import type { Input } from '../engine/input';
import { approach, dirDot, dist, type Vec2 } from '../engine/math';
import { tileAt, type World } from './world';

export type PlayerEvents = {
  jumped: boolean; hooked: boolean; bubbled: boolean; died: boolean; checkpoint: boolean; finished: boolean;
};

export class Player {
  pos: Vec2 = { x: 0, y: 0 };
  vel: Vec2 = { x: 0, y: 0 };
  spawn: Vec2 = { x: 0, y: 0 };
  grounded = false;
  anchor: Vec2 | null = null;
  ropeLength = 0;
  bubbleReady = true;
  bubbleCooldown = 0;
  bubbleFx = 0;
  bubblePos: Vec2 = { x: 0, y: 0 };
  deaths = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  private lastCheckpoint = -1;

  reset(world: World) {
    this.spawn = { ...world.start };
    this.pos = { ...world.start };
    this.vel = { x: 0, y: 0 };
    this.anchor = null;
    this.ropeLength = 0;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.bubbleReady = true;
    this.bubbleCooldown = 0;
    this.bubbleFx = 0;
    this.deaths = 0;
    this.lastCheckpoint = -1;
  }

  update(world: World, input: Input, camera: Vec2, dt: number): PlayerEvents {
    const ev: PlayerEvents = { jumped: false, hooked: false, bubbled: false, died: false, checkpoint: false, finished: false };
    this.coyote = this.grounded ? P.coyoteTime : Math.max(0, this.coyote - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.bubbleFx = Math.max(0, this.bubbleFx - dt);
    this.bubbleCooldown = Math.max(0, this.bubbleCooldown - dt);
    if (this.bubbleCooldown === 0) this.bubbleReady = true;

    if (input.take('jump')) this.jumpBuffer = P.jumpBuffer;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vel.y = -P.jumpVelocity;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      ev.jumped = true;
    }

    const digital = Number(input.has('right')) - Number(input.has('left'));
    const move = Math.abs(input.analogX) > 0.08 ? input.analogX : digital;
    const target = move * P.maxRunSpeed;
    const accel = (this.grounded ? P.groundAcceleration : P.airAcceleration) * dt;
    this.vel.x = Math.abs(move) > 0.01 ? approach(this.vel.x, target, accel) : this.grounded ? approach(this.vel.x, 0, P.groundFriction * dt) : this.vel.x;

    if (input.take('hook')) ev.hooked = this.tryHook(world, input, camera);
    if (!input.has('hook')) this.anchor = null;
    if (input.take('bubble') && this.bubbleReady) { this.bubble(input, camera); ev.bubbled = true; }

    if (this.anchor) {
      if (input.has('in')) this.ropeLength = Math.max(P.minRopeLength, this.ropeLength - P.reelSpeed * dt);
      if (input.has('out')) this.ropeLength = Math.min(P.hookRange, this.ropeLength + P.reelSpeed * dt);
      const dx = this.pos.x - this.anchor.x, dy = this.pos.y - this.anchor.y, d = Math.max(1, Math.hypot(dx, dy));
      const tx = -dy / d, ty = dx / d;
      const pump = move * P.swingPumpAcceleration * dt;
      this.vel.x += tx * pump;
      this.vel.y += ty * pump;
    }

    this.vel.y = Math.min(P.maxFallSpeed, this.vel.y + P.gravity * dt);
    this.moveAxis(world, this.vel.x * dt, 0);
    this.moveAxis(world, 0, this.vel.y * dt);
    this.solveRope();

    if (this.hit(world, '^') || this.pos.y > world.height * P.cell + 120) {
      this.respawn(); ev.died = true; return ev;
    }

    world.checkpoints.forEach((cp, i) => {
      if (i !== this.lastCheckpoint && dist(this.pos, cp) < 14) {
        this.lastCheckpoint = i;
        this.spawn = { ...cp };
        this.bubbleReady = true;
        this.bubbleCooldown = 0;
        ev.checkpoint = true;
      }
    });
    if (dist(this.pos, world.exit) < 14) { this.anchor = null; ev.finished = true; }
    return ev;
  }

  private tryHook(world: World, input: Input, camera: Vec2) {
    const aim = { x: input.aim.x + camera.x, y: input.aim.y + camera.y };
    let best: Vec2 | null = null, bestScore = Infinity;
    for (const anchor of world.anchors) {
      const playerDistance = dist(this.pos, anchor);
      if (playerDistance > P.hookRange) continue;
      const dot = dirDot(anchor.x - this.pos.x, anchor.y - this.pos.y, aim.x - this.pos.x, aim.y - this.pos.y);
      if (dot < P.hookAimCone) continue;
      const score = dist(aim, anchor) * P.hookAimWeight + playerDistance * P.hookDistanceWeight + (1 - dot) * 145;
      if (score < bestScore) { best = anchor; bestScore = score; }
    }
    if (!best) return false;
    this.anchor = best;
    this.ropeLength = Math.max(P.minRopeLength, dist(this.pos, best));
    return true;
  }

  private bubble(input: Input, camera: Vec2) {
    const aim = { x: input.aim.x + camera.x, y: input.aim.y + camera.y };
    let dx = aim.x - this.pos.x, dy = aim.y - this.pos.y, d = Math.hypot(dx, dy);
    if (d < 15) { dx = 0; dy = 1; d = 1; }
    dx /= d; dy /= d;
    this.vel.x -= dx * P.bubbleHorizontalImpulse;
    this.vel.y -= Math.max(0.35, Math.abs(dy)) * P.bubbleVerticalImpulse;
    if (dy < 0) this.vel.y += dy * 80;
    this.bubblePos = { x: this.pos.x + dx * 14, y: this.pos.y + dy * 14 };
    this.bubbleFx = 0.26;
    this.bubbleReady = false;
    this.bubbleCooldown = P.bubbleCooldown;
  }

  private solveRope() {
    if (!this.anchor) return;
    const dx = this.pos.x - this.anchor.x, dy = this.pos.y - this.anchor.y, d = Math.hypot(dx, dy);
    if (d <= this.ropeLength || d < 0.001) return;
    const nx = dx / d, ny = dy / d;
    this.pos.x = this.anchor.x + nx * this.ropeLength;
    this.pos.y = this.anchor.y + ny * this.ropeLength;
    const radial = this.vel.x * nx + this.vel.y * ny;
    if (radial > 0) { this.vel.x -= radial * nx; this.vel.y -= radial * ny; }
  }

  private moveAxis(world: World, dx: number, dy: number) {
    if (dx) {
      this.pos.x += dx;
      for (const [x, y] of this.near()) if (tileAt(world, x, y) === '#' && this.overlap(x, y)) {
        this.pos.x = dx > 0 ? x * P.cell - P.playerHalf : (x + 1) * P.cell + P.playerHalf;
        this.vel.x = 0;
      }
    }
    if (dy) {
      this.grounded = false;
      this.pos.y += dy;
      for (const [x, y] of this.near()) if (tileAt(world, x, y) === '#' && this.overlap(x, y)) {
        if (dy > 0) { this.pos.y = y * P.cell - P.playerHalf; this.grounded = true; }
        else this.pos.y = (y + 1) * P.cell + P.playerHalf;
        this.vel.y = 0;
      }
    }
  }

  private hit(world: World, tile: string) {
    return this.near().some(([x, y]) => tileAt(world, x, y) === tile && this.overlap(x, y, 3, 5));
  }

  private near() {
    const out: [number, number][] = [];
    const x = Math.floor(this.pos.x / P.cell), y = Math.floor(this.pos.y / P.cell);
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) out.push([xx, yy]);
    return out;
  }

  private overlap(x: number, y: number, pad = 0, top = 0) {
    const l = this.pos.x - P.playerHalf, r = this.pos.x + P.playerHalf, t = this.pos.y - P.playerHalf, b = this.pos.y + P.playerHalf;
    const tx = x * P.cell + pad, ty = y * P.cell + top, tw = P.cell - pad * 2, th = P.cell - top;
    return l < tx + tw && r > tx && t < ty + th && b > ty;
  }

  private respawn() {
    this.deaths++;
    this.anchor = null;
    this.pos = { ...this.spawn };
    this.vel = { x: 0, y: 0 };
    this.bubbleReady = true;
    this.bubbleCooldown = 0;
  }
}
