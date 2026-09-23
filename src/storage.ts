export type GhostPoint = { t: number; x: number; y: number };
export type LevelRecord = { bestMs?: number; bestDeaths?: number; ghost?: GhostPoint[] };
export type BindableAction = 'left' | 'right' | 'jump' | 'hook' | 'bubble' | 'restart';
export type KeyBindings = Record<BindableAction, string>;
export type Settings = {
  sound: boolean;
  music: boolean;
  ghost: boolean;
  speedrunHud: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  screenShake: boolean;
};

type SaveData = {
  version: 2;
  settings: Settings;
  bindings: KeyBindings;
  levels: Record<string, LevelRecord>;
  unlockedLevel: number;
  campaignBestMs?: number;
  campaignBestDeaths?: number;
};

const KEY = 'glyphhook-save-v2';
const LEGACY_KEY = 'glyphhook-save-v1';
const defaultSettings: Settings = {
  sound: true,
  music: true,
  ghost: true,
  speedrunHud: true,
  haptics: true,
  reducedMotion: false,
  highContrast: false,
  screenShake: true,
};
const defaultBindings: KeyBindings = {
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  hook: 'KeyX',
  bubble: 'KeyC',
  restart: 'KeyR',
};
const defaults: SaveData = {
  version: 2,
  settings: defaultSettings,
  bindings: defaultBindings,
  levels: {},
  unlockedLevel: 1,
};

export class SaveStore {
  data: SaveData = structuredClone(defaults);

  constructor() {
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        this.data = {
          ...defaults,
          ...parsed,
          version: 2,
          settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
          bindings: { ...defaultBindings, ...(parsed.bindings ?? {}) },
          levels: parsed.levels ?? {},
          unlockedLevel: Math.max(1, parsed.unlockedLevel ?? 1),
        };
        this.save();
      }
    } catch {
      this.data = structuredClone(defaults);
    }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* optional persistence */ }
  }

  record(levelId: string, ms: number, deaths: number, ghost: GhostPoint[]) {
    const current = this.data.levels[levelId] ?? {};
    const isBest = current.bestMs === undefined || ms < current.bestMs;
    const bestDeaths = current.bestDeaths === undefined ? deaths : Math.min(current.bestDeaths, deaths);
    this.data.levels[levelId] = isBest
      ? { bestMs: ms, bestDeaths, ghost: ghost.slice(0, 6000) }
      : { ...current, bestDeaths };
    this.save();
    return isBest;
  }

  unlock(index: number) {
    if (index > this.data.unlockedLevel) {
      this.data.unlockedLevel = index;
      this.save();
    }
  }

  recordCampaign(ms: number, deaths: number) {
    const isBest = this.data.campaignBestMs === undefined || ms < this.data.campaignBestMs;
    if (isBest) this.data.campaignBestMs = ms;
    if (this.data.campaignBestDeaths === undefined || deaths < this.data.campaignBestDeaths) this.data.campaignBestDeaths = deaths;
    this.save();
    return isBest;
  }

  setBinding(action: BindableAction, code: string) {
    this.data.bindings[action] = code;
    this.save();
  }
}
