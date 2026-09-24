import { PHYSICS as P } from './config/physics';
import { TinyAudio } from './engine/audio';
import { GamepadController } from './engine/gamepad';
import { Input, type Action } from './engine/input';
import { clamp, type Vec2 } from './engine/math';
import { Player } from './gameplay/player';
import { makeWorld, type World } from './gameplay/world';
import { LEVELS } from './levels/index';
import { validateLevels } from './levels/validate';
import { AsciiRenderer, formatMs, rankFor } from './rendering/asciiRenderer';
import { SaveStore, type BindableAction, type GhostPoint } from './storage';

export type GameMode = 'menu' | 'playing' | 'paused' | 'clear';

export class GlyphhookGame extends EventTarget {
  readonly save = new SaveStore();
  private renderer: AsciiRenderer;
  private input = new Input();
  private gamepad = new GamepadController();
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
  private introTimer = 0;
  private ghostRun: GhostPoint[] = [];
  private ghostSample = 0;
  private clearText = '';
  private campaign = false;
  private campaignMs = 0;
  private campaignDeaths = 0;
  private tutorialStep = 0;

  constructor(private canvas: HTMLCanvasElement) {
    super();
    validateLevels(LEVELS);
    this.renderer = new AsciiRenderer(canvas);
    this.renderer.setWorldSize(this.world.width * P.cell, this.world.height * P.cell);
    this.applySettings();
    this.player.reset(this.world);
    this.bindInput();
    addEventListener('resize', () => this.renderer.resize());
  }

  start() { requestAnimationFrame((t) => this.frame(t)); }
  getLevelIndex() { return this.levelIndex; }
  getMode() { return this.mode; }
  isCampaign() { return this.campaign; }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.audio.setAmbient(false);
    this.input.clearSource('keyboard');
    this.input.clearSource('pointer');
    this.input.clearSource('gamepad');
    this.input.touchAnalogX = 0;
    this.input.touchHookAssist = false;
    this.dispatchEvent(new CustomEvent('mode', { detail: { mode: this.mode } }));
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.audio.setAmbient(this.save.data.settings.music);
    this.dispatchEvent(new CustomEvent('mode', { detail: { mode: this.mode } }));
  }

  togglePause() {
    if (this.mode === 'playing') this.pause();
    else if (this.mode === 'paused') this.resume();
  }

  showMenu() {
    this.mode = 'menu';
    this.campaign = false;
    this.audio.setAmbient(false);
    this.input.clearTransient();
    this.input.clearSource('keyboard');
    this.input.clearSource('pointer');
    this.input.clearSource('gamepad');
    this.input.touchAnalogX = 0;
    this.input.touchHookAssist = false;
    this.dispatchEvent(new CustomEvent('mode', { detail: { mode: this.mode } }));
  }

  startCampaign() {
    this.campaign = true;
    this.campaignMs = 0;
    this.campaignDeaths = 0;
    this.loadLevel(1, true);
  }

  startLevel(index: number) {
    this.campaign = false;
    this.loadLevel(index, false);
  }

  restartLevel() {
    if (this.mode === 'playing' || this.mode === 'paused') this.loadLevel(this.levelIndex, this.campaign);
  }

  updateSettings() {
    this.applySettings();
    this.save.save();
  }

  setBinding(action: BindableAction, code: string) {
    this.save.setBinding(action, code);
  }

  private applySettings() {
    this.audio.enabled = this.save.data.settings.sound;
    this.audio.musicEnabled = this.save.data.settings.music;
    if (this.mode === 'playing') this.audio.setAmbient(this.save.data.settings.music);
  }

  private loadLevel(index: number, keepCampaign: boolean) {
    this.levelIndex = clamp(Math.floor(index), 0, LEVELS.length - 1);
    this.campaign = keepCampaign;
    this.world = makeWorld(LEVELS[this.levelIndex]);
    this.renderer.setWorldSize(this.world.width * P.cell, this.world.height * P.cell);
    this.player.reset(this.world);
    this.camera = { x: 0, y: 0 };
    this.runMs = 0;
    this.clearTimer = 0;
    this.introTimer = 1.5;
    this.clearText = '';
    this.tutorialStep = 0;
    this.ghostRun = [{ t: 0, x: this.player.pos.x, y: this.player.pos.y }];
    this.ghostSample = 0;
    this.mode = 'playing';
    this.audio.setAmbient(this.save.data.settings.music);
    if (!this.input.aimed) this.input.aim = { x: this.renderer.view.x * 0.7, y: this.renderer.view.y * 0.35 };
    this.dispatchEvent(new CustomEvent('mode', { detail: { mode: this.mode } }));
    this.emitTutorial();
  }

  private frame(t: number) {
    if (!this.last) this.last = t;
    this.acc += Math.min((t - this.last) / 1000, 0.05);
    this.last = t;
    while (this.acc >= P.fixedStep) {
      this.update(P.fixedStep);
      this.acc -= P.fixedStep;
    }

    const record = this.save.data.levels[this.world.def.id];
    const campaignText = this.campaign ? `CAMPAIGN ${formatMs(this.campaignMs + this.runMs)} · ×${this.campaignDeaths + this.player.deaths}` : '';
    const intro = this.introTimer > 0 ? `${this.world.def.subtitle} / ${this.world.def.mechanic}` : '';
    this.renderer.render(
      this.world,
      this.player,
      this.camera,
      this.input.aim,
      this.runMs,
      record?.bestMs,
      this.save.data.settings,
      record?.ghost,
      this.clearText,
      intro,
      campaignText,
    );
    requestAnimationFrame((n) => this.frame(n));
  }

  private update(dt: number) {
    this.gamepad.update(this.input, this.renderer.view.x, this.renderer.view.y);
    this.renderer.stepEffects(dt, this.player, this.save.data.settings);
    this.introTimer = Math.max(0, this.introTimer - dt);

    if (this.mode === 'menu' || this.mode === 'paused') return;

    if (this.mode === 'clear') {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0) this.afterClear();
      return;
    }

    this.runMs += dt * 1000;
    this.ghostSample += dt;
    if (this.ghostSample >= 0.05) {
      this.ghostSample = 0;
      this.ghostRun.push({ t: this.runMs, x: this.player.pos.x, y: this.player.pos.y });
    }

    const ev = this.player.update(this.world, this.input, this.camera, dt);
    this.updateTutorial(ev);
    if (ev.jumped) {
      this.audio.beep(330, 0.035, 0.018, 'square', 45);
      this.renderer.burst(this.player.pos, '#61ff98', 3, 35, this.save.data.settings);
    }
    if (ev.hooked && this.player.anchor) {
      this.audio.beep(690, 0.03, 0.022, 'square', 90);
      this.renderer.burst(this.player.anchor, '#ffd969', 7, 55, this.save.data.settings, '*');
      this.renderer.kickShake(2.5, this.save.data.settings);
      this.haptic(7);
    }
    if (ev.released) this.audio.beep(460, 0.024, 0.012, 'triangle', -80);
    if (ev.wrapped) this.audio.beep(540, 0.022, 0.01, 'triangle');
    if (ev.bubbled) {
      this.audio.beep(940, 0.065, 0.024, 'sine', 160);
      this.renderer.burst(this.player.bubblePos, '#58ebff', 9, 80, this.save.data.settings, '·');
      this.renderer.kickShake(4, this.save.data.settings);
      this.haptic(10);
    }
    if (ev.checkpoint) {
      this.audio.beep(780, 0.08, 0.028, 'square', 220);
      this.renderer.burst(this.player.pos, '#61ff98', 12, 95, this.save.data.settings, '+');
      this.renderer.kickShake(4, this.save.data.settings);
      this.haptic([8, 20, 8]);
    }
    if (ev.landed > 290) {
      this.renderer.burst(this.player.pos, '#8aa2ad', Math.min(8, Math.floor(ev.landed / 80)), 60, this.save.data.settings);
      this.renderer.kickShake(Math.min(5, ev.landed / 120), this.save.data.settings);
    }
    if (ev.wallHit > 320) {
      this.renderer.burst(this.player.pos, '#8aa2ad', 4, 50, this.save.data.settings);
      this.renderer.kickShake(2.5, this.save.data.settings);
    }
    if (ev.died) {
      this.audio.beep(115, 0.12, 0.035, 'sawtooth', -45);
      this.renderer.burst(this.player.spawn, '#ff5858', 14, 110, this.save.data.settings, 'x');
      this.renderer.kickShake(7, this.save.data.settings);
      this.haptic(20);
    }
    if (ev.finished) this.finishLevel();

    const maxX = Math.max(0, this.world.width * P.cell - this.renderer.view.x);
    const maxY = Math.max(0, this.world.height * P.cell - this.renderer.view.y);
    const lookAhead = clamp(this.player.vel.x * 0.22, -this.renderer.view.x * 0.12, this.renderer.view.x * 0.12);
    const targetX = clamp(this.player.pos.x - this.renderer.view.x * 0.5 + lookAhead, 0, maxX);
    const targetY = clamp(this.player.pos.y - this.renderer.view.y * 0.55 + clamp(this.player.vel.y * 0.06, -55, 80), 0, maxY);
    const f = this.save.data.settings.reducedMotion ? 1 : 1 - Math.exp(-P.cameraLag * dt);
    this.camera.x += (targetX - this.camera.x) * f;
    this.camera.y += (targetY - this.camera.y) * f;
  }

  private updateTutorial(ev: { jumped: boolean; hooked: boolean; released: boolean; bubbled: boolean }) {
    if (!this.world.def.training || this.tutorialStep >= 6) return;

    let advance = false;
    if (this.tutorialStep === 0) {
      advance = Math.abs(this.input.analogX) > 0.25 || this.input.has('left') || this.input.has('right');
    } else if (this.tutorialStep === 1) {
      advance = ev.jumped;
    } else if (this.tutorialStep === 2) {
      advance = this.input.aimed && Boolean(this.player.candidateAnchor);
    } else if (this.tutorialStep === 3) {
      advance = ev.hooked;
    } else if (this.tutorialStep === 4) {
      advance = ev.released;
    } else if (this.tutorialStep === 5) {
      advance = ev.bubbled;
    }

    if (advance) {
      this.tutorialStep++;
      this.emitTutorial();
    }
  }

  private emitTutorial() {
    if (!this.world.def.training || this.mode === 'menu') {
      this.dispatchEvent(new CustomEvent('tutorial', { detail: { text: '', step: -1 } }));
      return;
    }
    const steps = [
      '1/6  MOVE  — use A/D, arrows, stick or gamepad',
      '2/6  JUMP  — press Space / ↑ / JUMP / gamepad A',
      '3/6  AIM  — point toward a highlighted anchor',
      '4/6  HOLD HOOK  — the rope reels in while you swing',
      '5/6  RELEASE  — let go while moving upward/forward',
      '6/6  BUBBLE  — use the impulse to correct your arc',
      'TRAINING COMPLETE  — reach E when you are ready',
    ];
    this.dispatchEvent(new CustomEvent('tutorial', {
      detail: { text: steps[Math.min(this.tutorialStep, steps.length - 1)], step: this.tutorialStep },
    }));
  }

  private finishLevel() {
    if (this.mode !== 'playing') return;
    this.mode = 'clear';
    this.clearTimer = 1.25;
    const deaths = this.player.deaths;
    const isBest = this.save.record(this.world.def.id, this.runMs, deaths, this.ghostRun);
    const rank = rankFor(this.runMs, this.world.def.parMs);
    this.save.unlock(Math.min(LEVELS.length - 1, this.levelIndex + 1));

    if (this.campaign) {
      this.campaignMs += this.runMs;
      this.campaignDeaths += deaths;
    }

    this.clearText = `CLEAR  ${formatMs(this.runMs)}  [${rank}]${isBest ? '  NEW BEST' : ''}`;
    this.audio.beep(1000, 0.07, 0.032, 'square', 180);
    setTimeout(() => this.audio.beep(1320, 0.10, 0.028, 'square', 120), 80);
    this.renderer.burst(this.world.exit, '#c563ff', 18, 120, this.save.data.settings, '*');
    this.renderer.kickShake(5, this.save.data.settings);
    this.haptic([12, 28, 24]);

    this.dispatchEvent(new CustomEvent('finish', {
      detail: { level: this.world.def.id, levelIndex: this.levelIndex, ms: this.runMs, deaths, rank, isBest },
    }));
  }

  private afterClear() {
    if (this.campaign) {
      if (this.levelIndex < LEVELS.length - 1) {
        this.loadLevel(this.levelIndex + 1, true);
        return;
      }
      const isBest = this.save.recordCampaign(this.campaignMs, this.campaignDeaths);
      this.dispatchEvent(new CustomEvent('campaignfinish', {
        detail: { ms: this.campaignMs, deaths: this.campaignDeaths, isBest },
      }));
    }
    this.showMenu();
  }

  private haptic(pattern: number | number[]) {
    if (!this.save.data.settings.haptics) return;
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  private boundAction(code: string): Action | null {
    const bindings = this.save.data.bindings;
    const pairs: Array<[BindableAction, Action]> = [
      ['left', 'left'], ['right', 'right'], ['jump', 'jump'], ['hook', 'hook'], ['bubble', 'bubble'],
    ];
    for (const [name, action] of pairs) if (bindings[name] === code) return action;
    const fallback = new Map<string, Action>([
      ['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['ArrowUp', 'jump'], ['KeyZ', 'jump'],
      ['ShiftLeft', 'hook'], ['ShiftRight', 'hook'], ['KeyW', 'in'], ['KeyS', 'out'], ['ArrowDown', 'out'],
    ]);
    return fallback.get(code) ?? null;
  }

  private bindInput() {
    addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        this.togglePause();
        return;
      }
      if (e.code === 'F3') {
        e.preventDefault();
        this.save.data.settings.debugOverlay = !this.save.data.settings.debugOverlay;
        this.updateSettings();
        return;
      }
      if (e.code === this.save.data.bindings.restart && this.mode === 'playing') {
        e.preventDefault();
        this.restartLevel();
        return;
      }
      const action = this.boundAction(e.code);
      if (action) {
        e.preventDefault();
        this.input.set(action, true, 'keyboard');
      }
    }, { passive: false });

    addEventListener('keyup', (e) => {
      const action = this.boundAction(e.code);
      if (action) {
        e.preventDefault();
        this.input.set(action, false, 'keyboard');
      }
    }, { passive: false });

    addEventListener('blur', () => this.input.clearSource('keyboard'));

    const aim = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      this.input.aim = this.renderer.screenToView({ x: e.clientX - r.left, y: e.clientY - r.top });
      this.input.aimed = true;
    };

    this.canvas.addEventListener('pointermove', aim);
    this.canvas.addEventListener('pointerdown', (e) => {
      aim(e);
      if (e.pointerType === 'mouse' && e.button === 0) this.input.set('hook', true, 'pointer');
    });
    addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' && e.button === 0) this.input.set('hook', false, 'pointer');
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach((button) => {
      const action = button.dataset.control as 'jump' | 'hook' | 'bubble';
      const on = (e: PointerEvent) => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        if (action === 'hook') this.input.touchHookAssist = true;
        this.input.set(action, true, 'pointer');
      };
      const off = (e: PointerEvent) => {
        e.preventDefault();
        this.input.set(action, false, 'pointer');
        if (action === 'hook') this.input.touchHookAssist = false;
      };
      button.addEventListener('pointerdown', on);
      button.addEventListener('pointerup', off);
      button.addEventListener('pointercancel', off);
      button.addEventListener('lostpointercapture', () => this.input.set(action, false, 'pointer'));
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
      const dx = clamp(e.clientX - (r.left + r.width / 2), -r.width * 0.34, r.width * 0.34);
      this.input.touchAnalogX = dx / (r.width * 0.34);
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
      this.input.touchAnalogX = 0;
      knob.style.transform = 'translate(0,0)';
    };
    zone.addEventListener('pointerdown', down);
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
  }
}
