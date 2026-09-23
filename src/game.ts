import { PHYSICS as P } from './config/physics';
import { TinyAudio } from './engine/audio';
import { Input, type Action } from './engine/input';
import { clamp, type Vec2 } from './engine/math';
import { Player } from './gameplay/player';
import { makeWorld, type World } from './gameplay/world';
import { LEVELS } from './levels/index';
import { AsciiRenderer, formatMs, rankFor } from './rendering/asciiRenderer';
import { SaveStore, type GhostPoint } from './storage';

export type GameMode = 'menu' | 'playing' | 'clear';

export class GlyphhookGame extends EventTarget {
  readonly save = new SaveStore();
  private renderer: AsciiRenderer;
  private input = new Input();
  private audio = new TinyAudio();
  private player = new Player();
  private world: World = makeWorld(LEVELS[0]);
  private levelIndex = 0;
  private camera: Vec2 = { x: 0, y: 0 };
  private mode: GameMode = 'menu';
  private last = 0;
  private acc = 0;
  private runMs = 0;
  private clearTimer = 0;
  private ghostRun: GhostPoint[] = [];
  private ghostSample = 0;
  private clearText = '';

  constructor(private canvas: HTMLCanvasElement) {
    super();
    this.renderer = new AsciiRenderer(canvas);
    this.audio.enabled = this.save.data.settings.sound;
    this.player.reset(this.world);
    this.bindInput();
    addEventListener('resize', () => this.renderer.resize());
  }

  start() { requestAnimationFrame((t) => this.frame(t)); }
  getLevelIndex() { return this.levelIndex; }
  getMode() { return this.mode; }

  showMenu() {
    this.mode = 'menu';
    this.input.clearTransient();
    this.dispatchEvent(new CustomEvent('mode', { detail: { mode: this.mode } }));
  }

  startLevel(index: number) {
    this.levelIndex = clamp(Math.floor(index), 0, LEVELS.length - 1);
    this.world = makeWorld(LEVELS[this.levelIndex]);
    this.player.reset(this.world);
    this.camera = { x: 0, y: 0 };
    this.runMs = 0;
    this.clearTimer = 0;
    this.clearText = '';
    this.ghostRun = [{ t: 0, x: this.player.pos.x, y: this.player.pos.y }];
    this.ghostSample = 0;
    this.mode = 'playing';
    if (!this.input.aimed) {
      this.input.aim = { x: this.renderer.view.x * 0.7, y: this.renderer.view.y * 0.35 };
    }
    this.dispatchEvent(new CustomEvent('mode', { detail: { mode: this.mode } }));
  }

  updateSettings() {
    this.audio.enabled = this.save.data.settings.sound;
    this.save.save();
  }

  private frame(t: number) {
    if (!this.last) this.last = t;
    this.acc += Math.min((t - this.last) / 1000, 0.05);
    this.last = t;
    while (this.acc >= P.fixedStep) {
      this.update(P.fixedStep);
      this.acc -= P.fixedStep;
    }
    const rec = this.save.data.levels[this.world.def.id];
    this.renderer.render(
      this.world,
      this.player,
      this.camera,
      this.input.aim,
      this.runMs,
      rec?.bestMs,
      this.save.data.settings,
      rec?.ghost,
      this.clearText,
    );
    requestAnimationFrame((n) => this.frame(n));
  }

  private update(dt: number) {
    if (this.mode === 'menu') return;
    if (this.mode === 'clear') {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0) {
        if (this.levelIndex < LEVELS.length - 1) this.startLevel(this.levelIndex + 1);
        else this.showMenu();
      }
      return;
    }

    this.runMs += dt * 1000;
    this.ghostSample += dt;
    if (this.ghostSample >= 0.05) {
      this.ghostSample = 0;
      this.ghostRun.push({ t: this.runMs, x: this.player.pos.x, y: this.player.pos.y });
    }

    const ev = this.player.update(this.world, this.input, this.camera, dt);
    if (ev.jumped) this.audio.beep(315, 0.045, 0.025);
    if (ev.hooked) {
      this.audio.beep(620, 0.035, 0.025);
      this.haptic(8);
    }
    if (ev.bubbled) {
      this.audio.beep(880, 0.07, 0.025, 'sine');
      this.haptic(10);
    }
    if (ev.checkpoint) {
      this.audio.beep(760, 0.09, 0.03);
      this.haptic([10, 25, 10]);
    }
    if (ev.died) {
      this.audio.beep(110, 0.12, 0.04, 'sawtooth');
      this.haptic(20);
    }
    if (ev.finished) this.finishLevel();

    const maxX = Math.max(0, this.world.width * P.cell - this.renderer.view.x);
    const maxY = Math.max(0, this.world.height * P.cell - this.renderer.view.y);
    const targetX = clamp(this.player.pos.x - this.renderer.view.x * 0.5, 0, maxX);
    const targetY = clamp(this.player.pos.y - this.renderer.view.y * 0.55, 0, maxY);
    const f = 1 - Math.exp(-P.cameraLag * dt);
    this.camera.x += (targetX - this.camera.x) * f;
    this.camera.y += (targetY - this.camera.y) * f;
  }

  private finishLevel() {
    if (this.mode !== 'playing') return;
    this.mode = 'clear';
    this.clearTimer = 1.35;
    const isBest = this.save.record(this.world.def.id, this.runMs, this.ghostRun);
    const rank = rankFor(this.runMs, this.world.def.parMs);
    this.clearText = `CLEAR  ${formatMs(this.runMs)}  [${rank}]${isBest ? '  NEW BEST' : ''}`;
    this.audio.beep(980, 0.08, 0.035, 'square');
    setTimeout(() => this.audio.beep(1310, 0.11, 0.03, 'square'), 90);
    this.haptic([15, 30, 30]);
    this.dispatchEvent(new CustomEvent('finish', {
      detail: { level: this.world.def.id, ms: this.runMs, rank, isBest },
    }));
  }

  private haptic(pattern: number | number[]) {
    if (!this.save.data.settings.haptics) return;
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  private bindInput() {
    const keys = new Map<string, Action>([
      ['KeyA', 'left'], ['ArrowLeft', 'left'], ['KeyD', 'right'], ['ArrowRight', 'right'],
      ['Space', 'jump'], ['KeyZ', 'jump'], ['KeyX', 'hook'], ['ShiftLeft', 'hook'], ['ShiftRight', 'hook'],
      ['KeyC', 'bubble'], ['KeyW', 'in'], ['ArrowUp', 'in'], ['KeyS', 'out'], ['ArrowDown', 'out'],
    ]);

    addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        this.showMenu();
        return;
      }
      if (e.code === 'KeyR' && this.mode === 'playing') {
        e.preventDefault();
        this.startLevel(this.levelIndex);
        return;
      }
      const action = keys.get(e.code);
      if (action) {
        e.preventDefault();
        this.input.set(action, true);
      }
    }, { passive: false });

    addEventListener('keyup', (e) => {
      const action = keys.get(e.code);
      if (action) {
        e.preventDefault();
        this.input.set(action, false);
      }
    }, { passive: false });

    const aim = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      this.input.aim = { x: e.clientX - r.left, y: e.clientY - r.top };
      this.input.aimed = true;
    };

    this.canvas.addEventListener('pointermove', aim);
    this.canvas.addEventListener('pointerdown', (e) => {
      aim(e);
      if (e.pointerType === 'mouse' && e.button === 0) this.input.set('hook', true);
    });
    addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' && e.button === 0) this.input.set('hook', false);
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach((button) => {
      const action = button.dataset.control as 'jump' | 'hook' | 'bubble';
      const on = (e: PointerEvent) => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.input.set(action, true);
      };
      const off = (e: PointerEvent) => {
        e.preventDefault();
        this.input.set(action, false);
      };
      button.addEventListener('pointerdown', on);
      button.addEventListener('pointerup', off);
      button.addEventListener('pointercancel', off);
      button.addEventListener('lostpointercapture', () => this.input.set(action, false));
    });

    this.bindStick();
    const aimZone = document.querySelector<HTMLElement>('#aim-zone');
    aimZone?.addEventListener('pointerdown', (e) => {
      aimZone.setPointerCapture(e.pointerId);
      aim(e);
    });
    aimZone?.addEventListener('pointermove', (e) => {
      if (aimZone.hasPointerCapture(e.pointerId)) aim(e);
    });
  }

  private bindStick() {
    const zone = document.querySelector<HTMLElement>('#stick-zone');
    const knob = document.querySelector<HTMLElement>('#stick-knob');
    if (!zone || !knob) return;

    let pointer: number | null = null;
    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      const r = zone.getBoundingClientRect();
      const dx = clamp(
        e.clientX - (r.left + r.width / 2),
        -r.width * 0.34,
        r.width * 0.34,
      );
      this.input.analogX = dx / (r.width * 0.34);
      knob.style.transform = `translate(${dx}px, 0)`;
    };

    const down = (e: PointerEvent) => {
      e.preventDefault();
      pointer = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      move(e);
    };

    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      this.input.analogX = 0;
      knob.style.transform = 'translate(0,0)';
    };

    zone.addEventListener('pointerdown', down);
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
  }
}
