export type GhostPoint = { t: number; x: number; y: number };
export type LevelRecord = { bestMs?: number; ghost?: GhostPoint[] };
export type Settings = { sound: boolean; ghost: boolean; speedrunHud: boolean; haptics: boolean };

type SaveData = {
  version: 1;
  settings: Settings;
  levels: Record<string, LevelRecord>;
};

const KEY = 'glyphhook-save-v1';
const defaults: SaveData = {
  version: 1,
  settings: { sound: true, ghost: true, speedrunHud: true, haptics: true },
  levels: {},
};

export class SaveStore {
  data: SaveData = structuredClone(defaults);

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        this.data = { ...defaults, ...parsed, settings: { ...defaults.settings, ...(parsed.settings ?? {}) } };
      }
    } catch {
      this.data = structuredClone(defaults);
    }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* optional persistence */ }
  }

  record(levelId: string, ms: number, ghost: GhostPoint[]) {
    const current = this.data.levels[levelId] ?? {};
    if (current.bestMs === undefined || ms < current.bestMs) {
      this.data.levels[levelId] = { bestMs: ms, ghost: ghost.slice(0, 6000) };
      this.save();
      return true;
    }
    return false;
  }
}
