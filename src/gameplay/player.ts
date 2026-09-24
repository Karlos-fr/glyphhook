import { PHYSICS as P } from '../config/physics';
import type { Input } from '../engine/input';
import { approach, dirDot, dist, type Vec2 } from '../engine/math';
import { bestWrapCorner, firstSolidOnSegment, lineClear, tileAt, type World } from './world';

export type PlayerEvents = {
  jumped: boolean;
  hooked: boolean;
  released: boolean;
  bubbled: boolean;
  died: boolean;
  checkpoint: boolean;
  finished: boolean;
  landed: number;
  wallHit: number;
  wrapped: boolean;
};

export class Player {
  pos: Vec2 = { x: 0, y: 0 };
  vel: Vec2 = { x: 0, y: 0 };
  spawn: Vec2 = { x: 0, y: 0 };
  grounded = false;
  anchor: Vec2 | null = null;
  candidateAnchor: Vec2 | null = null;
  ropePivots: Vec2[] = [];
  ropeLength = 0;
  bubbleReady = true;
  bubbleCooldown = 0;
  bubbleFx = 0;
  bubblePos: Vec2 = { x: 0, y: 0 };
  deaths = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  private lastCheckpoint = -1;
  private landedImpact = 0;
  private wallImpact = 0;
  private pivotCooldown = 0;

  get speed() { return Math.hypot(this.vel.x, this.vel.y); }
  get ropePoints(): Vec2[] { return this.anchor ? [...this.ropePivots, this.anchor] : []; }
  get checkpointIndex() { return this.lastCheckpoint; }

  reset(world: World) {
    this.spawn = { ...world.start };
    this.pos = { ...world.start };
    this.vel = { x: 0, y: 0 };
    this.anchor = null;
    this.candidateAnchor = null;
    this.ropePivots = [];
    this.ropeLength = 0;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.bubbleReady = true;
    this.bubbleCooldown = 0;
    this.bubbleFx = 0;
    this.deaths = 0;
    this.lastCheckpoint = -1;
    this.pivotCooldown = 0;
  }

  update(world: World, input: Input, camera: Vec2, dt: number): PlayerEvents {
    const ev: PlayerEvents = {
      jumped: false, hooked: false, released: false, bubbled: false, died: false,
      checkpoint: false, finished: false, landed: 0, wallHit: 0, wrapped: false,
    };
    this.landedImpact = 0;
    this.wallImpact = 0;
    this.pivotCooldown = Math.max(0, this.pivotCooldown - dt);
    this.coyote = this.grounded ? P.coyoteTime : Math.max(0, this.coyote - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.bubbleFx = Math.max(0, this.bubbleFx - dt);
    this.bubbleCooldown = Math.max(0, this.bubbleCooldown - dt);
    if (this.bubbleCooldown === 0) this.bubbleReady = true;

    this.candidateAnchor = this.anchor ? this.anchor : this.findHookCandidate(world, input, camera);

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
    this.vel.x = Math.abs(move) > 0.01
      ? approach(this.vel.x, target, accel)
      : this.grounded ? approach(this.vel.x, 0, P.groundFriction * dt) : this.vel.x;

    const hookPressed = input.take('hook');
    if (!this.anchor && (hookPressed || (input.touchHookAssist && input.has('hook')))) {
      ev.hooked = this.tryHook(world, input, camera);
    }
    if (this.anchor && !input.has('hook')) {
      this.anchor = null;
      this.ropePivots = [];
      ev.released = true;
    }
    if (input.take('bubble') && this.bubbleReady) {
      this.bubble(input, camera);
      ev.bubbled = true;
    }

    if (this.anchor) {
      const tail = this.ropeTailLength();
      const minTotal = tail + P.minRopeLength;
      if (input.has('in')) this.ropeLength = Math.max(minTotal, this.ropeLength - P.reelSpeed * dt);
      if (input.has('out')) this.ropeLength = Math.min(P.hookRange + tail, this.ropeLength + P.reelSpeed * dt);
      const targetPoint = this.ropePivots[0] ?? this.anchor;
      const dx = this.pos.x - targetPoint.x;
      const dy = this.pos.y - targetPoint.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const tx = -dy / d;
      const ty = dx / d;
      const pumpDirection = Math.sign(move * (this.vel.x * tx + this.vel.y * ty) || move);
      const pump = Math.abs(move) * pumpDirection * P.swingPumpAcceleration * dt;
      this.vel.x += tx * pump;
      this.vel.y += ty * pump;
    }

    this.vel.y = Math.min(P.maxFallSpeed, this.vel.y + P.gravity * dt);
    this.moveAxis(world, this.vel.x * dt, 0);
    this.moveAxis(world, 0, this.vel.y * dt);

    if (this.anchor) {
      ev.wrapped = this.updateRopePath(world);
      for (let i = 0; i < P.ropeIterations; i++) {
        this.solveRope();
        this.resolveSolidPenetration(world);
      }
      this.updateRopePath(world);
    }

    ev.landed = this.landedImpact;
    ev.wallHit = this.wallImpact;

    if (this.hit(world, '^') || this.pos.y > world.height * P.cell + 120) {
      this.respawn();
      ev.died = true;
      return ev;
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

    if (dist(this.pos, world.exit) < 14) {
      this.anchor = null;
      this.ropePivots = [];
      ev.finished = true;
    }

    if (!this.anchor) this.candidateAnchor = this.findHookCandidate(world, input, camera);
    return ev;
  }

  private findHookCandidate(world: World, input: Input, camera: Vec2) {
    const aim = { x: input.aim.x + camera.x, y: input.aim.y + camera.y };
    let best: Vec2 | null = null;
    let bestScore = Infinity;
    let assistBest: Vec2 | null = null;
    let assistScore = Infinity;

    for (const anchor of world.anchors) {
      const playerDistance = dist(this.pos, anchor);
      if (playerDistance > P.hookRange || !lineClear(world, this.pos, anchor)) continue;

      const dot = dirDot(anchor.x - this.pos.x, anchor.y - this.pos.y, aim.x - this.pos.x, aim.y - this.pos.y);
      const score = dist(aim, anchor) * P.hookAimWeight + playerDistance * P.hookDistanceWeight + (1 - dot) * 130;

      if (dot >= P.hookAimCone && score < bestScore) {
        best = anchor;
        bestScore = score;
      }

      if (input.touchHookAssist) {
        const belowPenalty = anchor.y > this.pos.y + 28 ? 150 : 0;
        const sidePenalty = Math.abs(anchor.x - this.pos.x) * 0.06;
        const assist = playerDistance + belowPenalty + sidePenalty + (1 - dot) * 28;
        if (assist < assistScore) {
          assistBest = anchor;
          assistScore = assist;
        }
      }
    }

    return best ?? assistBest;
  }

  private tryHook(world: World, input: Input, camera: Vec2) {
    const best = this.candidateAnchor ?? this.findHookCandidate(world, input, camera);
    if (!best) return false;
    this.anchor = { ...best };
    this.ropePivots = [];
    this.ropeLength = Math.max(P.minRopeLength, dist(this.pos, best));
    this.candidateAnchor = this.anchor;
    return true;
  }

  private updateRopePath(world: World) {
    if (!this.anchor) return false;
    let changed = false;

    while (this.ropePivots.length && this.pivotCooldown <= 0) {
      const beyond = this.ropePivots[1] ?? this.anchor;
      if (!lineClear(world, this.pos, beyond)) break;
      this.ropePivots.shift();
      this.pivotCooldown = 0.045;
      changed = true;
    }

    const target = this.ropePivots[0] ?? this.anchor;
    const hit = firstSolidOnSegment(world, this.pos, target);
    if (hit && this.ropePivots.length < 8) {
      const corner = bestWrapCorner(world, hit, this.pos, target);
      const duplicate = this.ropePivots.some((p) => dist(p, corner) < 3);
      if (!duplicate && dist(this.pos, corner) > 10 && dist(corner, target) > 5) {
        this.ropePivots.unshift(corner);
        this.pivotCooldown = 0.055;
        this.ropeLength = Math.max(this.ropeLength, this.ropeTailLength() + P.minRopeLength);
        changed = true;
      }
    }
    return changed;
  }

  private ropeTailLength() {
    if (!this.anchor || !this.ropePivots.length) return 0;
    let total = 0;
    for (let i = 0; i < this.ropePivots.length; i++) {
      const next = this.ropePivots[i + 1] ?? this.anchor;
      total += dist(this.ropePivots[i], next);
    }
    return total;
  }

  private solveRope() {
    if (!this.anchor) return;
    const target = this.ropePivots[0] ?? this.anchor;
    const activeLength = Math.max(P.minRopeLength, this.ropeLength - this.ropeTailLength());
    const dx = this.pos.x - target.x;
    const dy = this.pos.y - target.y;
    const d = Math.hypot(dx, dy);
    if (d <= activeLength || d < 0.001) return;
    const nx = dx / d;
    const ny = dy / d;
    this.pos.x = target.x + nx * activeLength;
    this.pos.y = target.y + ny * activeLength;
    const radial = this.vel.x * nx + this.vel.y * ny;
    if (radial > 0) {
      this.vel.x -= radial * nx;
      this.vel.y -= radial * ny;
    }
  }

  private bubble(input: Input, camera: Vec2) {
    const aim = { x: input.aim.x + camera.x, y: input.aim.y + camera.y };
    let dx = aim.x - this.pos.x;
    let dy = aim.y - this.pos.y;
    let d = Math.hypot(dx, dy);
    if (d < 15) { dx = 0; dy = 1; d = 1; }
    dx /= d;
    dy /= d;
    this.vel.x -= dx * P.bubbleHorizontalImpulse;
    this.vel.y -= Math.max(0.36, Math.abs(dy)) * P.bubbleVerticalImpulse;
    if (dy < 0) this.vel.y += dy * 72;
    this.bubblePos = { x: this.pos.x + dx * 14, y: this.pos.y + dy * 14 };
    this.bubbleFx = 0.25;
    this.bubbleReady = false;
    this.bubbleCooldown = P.bubbleCooldown;
  }

  private moveAxis(world: World, dx: number, dy: number) {
    if (dx) {
      const impact = Math.abs(this.vel.x);
      this.pos.x += dx;
      for (const [x, y] of this.near()) if (tileAt(world, x, y) === '#' && this.overlap(x, y)) {
        this.pos.x = dx > 0 ? x * P.cell - P.playerHalf : (x + 1) * P.cell + P.playerHalf;
        this.vel.x = 0;
        this.wallImpact = Math.max(this.wallImpact, impact);
      }
    }

    if (dy) {
      const wasGrounded = this.grounded;
      const impact = Math.abs(this.vel.y);
      this.grounded = false;
      this.pos.y += dy;
      for (const [x, y] of this.near()) if (tileAt(world, x, y) === '#' && this.overlap(x, y)) {
        if (dy > 0) {
          this.pos.y = y * P.cell - P.playerHalf;
          this.grounded = true;
          if (!wasGrounded) this.landedImpact = Math.max(this.landedImpact, impact);
        } else {
          this.pos.y = (y + 1) * P.cell + P.playerHalf;
        }
        this.vel.y = 0;
      }
    }
  }

  private resolveSolidPenetration(world: World) {
    for (let pass = 0; pass < 2; pass++) {
      let resolved = false;
      for (const [x, y] of this.near()) {
        if (tileAt(world, x, y) !== '#' || !this.overlap(x, y)) continue;
        const left = this.pos.x + P.playerHalf - x * P.cell;
        const right = (x + 1) * P.cell - (this.pos.x - P.playerHalf);
        const top = this.pos.y + P.playerHalf - y * P.cell;
        const bottom = (y + 1) * P.cell - (this.pos.y - P.playerHalf);
        const min = Math.min(left, right, top, bottom);
        if (min === left) this.pos.x -= left;
        else if (min === right) this.pos.x += right;
        else if (min === top) this.pos.y -= top;
        else this.pos.y += bottom;
        resolved = true;
      }
      if (!resolved) break;
    }
  }

  private hit(world: World, tile: string) {
    return this.near().some(([x, y]) => tileAt(world, x, y) === tile && this.overlap(x, y, 3, 5));
  }

  private near() {
    const out: [number, number][] = [];
    const x = Math.floor(this.pos.x / P.cell);
    const y = Math.floor(this.pos.y / P.cell);
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) out.push([xx, yy]);
    return out;
  }

  private overlap(x: number, y: number, pad = 0, top = 0) {
    const l = this.pos.x - P.playerHalf;
    const r = this.pos.x + P.playerHalf;
    const t = this.pos.y - P.playerHalf;
    const b = this.pos.y + P.playerHalf;
    const tx = x * P.cell + pad;
    const ty = y * P.cell + top;
    const tw = P.cell - pad * 2;
    const th = P.cell - top;
    return l < tx + tw && r > tx && t < ty + th && b > ty;
  }

  private respawn() {
    this.deaths++;
    this.anchor = null;
    this.candidateAnchor = null;
    this.ropePivots = [];
    this.pos = { ...this.spawn };
    this.vel = { x: 0, y: 0 };
    this.bubbleReady = true;
    this.bubbleCooldown = 0;
  }
}
