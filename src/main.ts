import './style.css';
import { GlyphhookGame } from './game';
import { LEVELS } from './levels/index';
import { formatMs, rankFor } from './rendering/asciiRenderer';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Missing #game canvas');
const game = new GlyphhookGame(canvas);
const menu = document.querySelector<HTMLElement>('#menu')!;
const levelPanel = document.querySelector<HTMLElement>('#level-select')!;
const settingsPanel = document.querySelector<HTMLElement>('#settings')!;
const levelList = document.querySelector<HTMLElement>('#level-list')!;
const toast = document.querySelector<HTMLElement>('#toast')!;

function hidePanels() { [menu, levelPanel, settingsPanel].forEach((p) => p.classList.remove('visible')); }
function show(panel: HTMLElement) { hidePanels(); panel.classList.add('visible'); document.body.classList.remove('playing'); }

function renderLevels() {
  levelList.innerHTML = '';
  LEVELS.forEach((level, index) => {
    const rec = game.save.data.levels[level.id];
    const button = document.createElement('button');
    button.className = 'level-card';
    button.innerHTML = `<span><b>${level.name}</b><small>${level.subtitle}</small></span><span class="record">${rec?.bestMs !== undefined ? `${formatMs(rec.bestMs)} [${rankFor(rec.bestMs, level.parMs)}]` : '--:--.---'}</span>`;
    button.addEventListener('click', () => {
      hidePanels();
      document.body.classList.add('playing');
      game.startLevel(index);
    });
    levelList.append(button);
  });
}

function bindToggle(id: string, key: keyof typeof game.save.data.settings) {
  const input = document.querySelector<HTMLInputElement>(id)!;
  input.checked = game.save.data.settings[key];
  input.addEventListener('change', () => {
    game.save.data.settings[key] = input.checked;
    game.updateSettings();
  });
}

bindToggle('#sound-toggle', 'sound');
bindToggle('#ghost-toggle', 'ghost');
bindToggle('#speedrun-toggle', 'speedrunHud');
bindToggle('#haptics-toggle', 'haptics');

document.querySelector('[data-menu="play"]')?.addEventListener('click', () => {
  hidePanels();
  document.body.classList.add('playing');
  game.startLevel(1);
});
document.querySelector('[data-menu="levels"]')?.addEventListener('click', () => {
  renderLevels();
  show(levelPanel);
});
document.querySelector('[data-menu="settings"]')?.addEventListener('click', () => show(settingsPanel));
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => show(menu)));

game.addEventListener('mode', (event) => {
  const mode = (event as CustomEvent<{ mode: string }>).detail.mode;
  if (mode === 'menu') {
    renderLevels();
    show(menu);
  } else {
    hidePanels();
    document.body.classList.add('playing');
  }
});

game.addEventListener('finish', (event) => {
  const d = (event as CustomEvent<{ isBest: boolean; rank: string }>).detail;
  if (d.isBest) {
    toast.textContent = `NEW BEST · RANK ${d.rank}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1300);
  }
});

const fullscreen = document.querySelector<HTMLButtonElement>('#fullscreen')!;
fullscreen.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      const orientation = screen.orientation as unknown as { lock?: (mode: string) => Promise<void> };
      await orientation.lock?.('landscape').catch(() => undefined);
    } else {
      await document.exitFullscreen();
    }
  } catch {
    // Fullscreen/orientation lock are optional and not exposed by every mobile browser.
  }
});

renderLevels();
game.start();
