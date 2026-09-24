import './style.css';
import { GlyphhookGame } from './game';
import { LEVELS } from './levels/index';
import { formatMs, rankFor } from './rendering/asciiRenderer';
import type { BindableAction } from './storage';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Missing #game canvas');

const game = new GlyphhookGame(canvas);
const menu = document.querySelector<HTMLElement>('#menu')!;
const levelPanel = document.querySelector<HTMLElement>('#level-select')!;
const settingsPanel = document.querySelector<HTMLElement>('#settings')!;
const resultsPanel = document.querySelector<HTMLElement>('#results')!;
const pausePanel = document.querySelector<HTMLElement>('#pause')!;
const levelList = document.querySelector<HTMLElement>('#level-list')!;
const toast = document.querySelector<HTMLElement>('#toast')!;
const campaignRecord = document.querySelector<HTMLElement>('#campaign-record')!;
const resultTime = document.querySelector<HTMLElement>('#result-time')!;
const resultDeaths = document.querySelector<HTMLElement>('#result-deaths')!;
const resultRecord = document.querySelector<HTMLElement>('#result-record')!;
const resultMessage = document.querySelector<HTMLElement>('#result-message')!;
const installButton = document.querySelector<HTMLButtonElement>('#install-app')!;
const tutorial = document.querySelector<HTMLElement>('#tutorial')!;
let settingsReturnPanel: HTMLElement = menu;

function hidePanels() {
  [menu, levelPanel, settingsPanel, resultsPanel, pausePanel].forEach((panel) => panel.classList.remove('visible'));
}

function show(panel: HTMLElement) {
  hidePanels();
  panel.classList.add('visible');
  document.body.classList.remove('playing');
}

function showToast(text: string, duration = 1400) {
  toast.textContent = text;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), duration);
}

function renderCampaignRecord() {
  const best = game.save.data.campaignBestMs;
  const deaths = game.save.data.campaignBestDeaths;
  campaignRecord.textContent = best === undefined
    ? 'CAMPAIGN BEST  --:--.---'
    : `CAMPAIGN BEST  ${formatMs(best)}${deaths !== undefined ? `  ×${deaths}` : ''}`;
}

function renderLevels() {
  levelList.innerHTML = '';
  LEVELS.forEach((level, index) => {
    const record = game.save.data.levels[level.id];
    const unlocked = level.training || index <= game.save.data.unlockedLevel;
    const button = document.createElement('button');
    button.className = 'level-card';
    button.disabled = !unlocked;
    const result = record?.bestMs !== undefined
      ? `${formatMs(record.bestMs)} [${rankFor(record.bestMs, level.parMs)}]${record.bestDeaths !== undefined ? ` ×${record.bestDeaths}` : ''}`
      : '--:--.---';
    button.innerHTML = `
      <span>
        <b>${unlocked ? level.name : '██ / LOCKED'}</b>
        <small>${unlocked ? `${level.subtitle} · ${level.mechanic}` : 'COMPLETE THE PREVIOUS LEVEL'}</small>
      </span>
      <span class="record">${unlocked ? result : 'LOCKED'}</span>
    `;
    if (unlocked) {
      button.addEventListener('click', () => {
        hidePanels();
        document.body.classList.add('playing');
        game.startLevel(index);
      });
    }
    levelList.append(button);
  });
}

function bindToggle(selector: string, key: keyof typeof game.save.data.settings) {
  const input = document.querySelector<HTMLInputElement>(selector)!;
  input.checked = game.save.data.settings[key];
  input.addEventListener('change', () => {
    game.save.data.settings[key] = input.checked;
    game.updateSettings();
    document.body.classList.toggle('reduced-motion', game.save.data.settings.reducedMotion);
  });
}

bindToggle('#sound-toggle', 'sound');
bindToggle('#music-toggle', 'music');
bindToggle('#ghost-toggle', 'ghost');
bindToggle('#speedrun-toggle', 'speedrunHud');
bindToggle('#haptics-toggle', 'haptics');
bindToggle('#shake-toggle', 'screenShake');
bindToggle('#motion-toggle', 'reducedMotion');
bindToggle('#contrast-toggle', 'highContrast');
bindToggle('#debug-toggle', 'debugOverlay');

const bindButtons = document.querySelectorAll<HTMLButtonElement>('[data-bind]');
function keyLabel(code: string) {
  if (code === 'Space') return 'SPACE';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code.replace('Arrow', '').toUpperCase();
}

function refreshBindings() {
  bindButtons.forEach((button) => {
    const action = button.dataset.bind as BindableAction;
    button.textContent = keyLabel(game.save.data.bindings[action]);
  });
}

bindButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.bind as BindableAction;
    const oldCode = game.save.data.bindings[action];
    button.textContent = 'PRESS KEY…';
    button.classList.add('listening');

    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const other = (Object.keys(game.save.data.bindings) as BindableAction[])
        .find((name) => name !== action && game.save.data.bindings[name] === event.code);
      if (other) game.setBinding(other, oldCode);
      game.setBinding(action, event.code);
      button.classList.remove('listening');
      refreshBindings();
    };
    addEventListener('keydown', capture, { once: true, capture: true });
  });
});

document.querySelector('[data-menu="campaign"]')?.addEventListener('click', () => {
  hidePanels();
  document.body.classList.add('playing');
  game.startCampaign();
});

document.querySelector('[data-menu="levels"]')?.addEventListener('click', () => {
  renderLevels();
  show(levelPanel);
});

document.querySelector('[data-menu="settings"]')?.addEventListener('click', () => {
  settingsReturnPanel = menu;
  show(settingsPanel);
});
document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => {
  if (button.closest('#settings')) show(settingsReturnPanel);
  else show(menu);
}));

document.querySelector('#pause-resume')?.addEventListener('click', () => {
  game.resume();
  document.body.classList.add('playing');
});
document.querySelector('#pause-restart')?.addEventListener('click', () => {
  game.restartLevel();
  document.body.classList.add('playing');
});
document.querySelector('#pause-settings')?.addEventListener('click', () => {
  settingsReturnPanel = pausePanel;
  show(settingsPanel);
});
document.querySelector('#pause-quit')?.addEventListener('click', () => game.showMenu());

document.querySelector('#results-replay')?.addEventListener('click', () => {
  hidePanels();
  document.body.classList.add('playing');
  game.startCampaign();
});
document.querySelector('#results-back')?.addEventListener('click', () => show(menu));

game.addEventListener('mode', (event) => {
  const mode = (event as CustomEvent<{ mode: string }>).detail.mode;
  if (mode === 'menu') {
    renderLevels();
    renderCampaignRecord();
    tutorial.textContent = '';
    show(menu);
  } else if (mode === 'paused') {
    tutorial.classList.remove('visible');
    show(pausePanel);
  } else {
    hidePanels();
    document.body.classList.add('playing');
  }
});

game.addEventListener('tutorial', (event) => {
  const detail = (event as CustomEvent<{ text: string; step: number }>).detail;
  tutorial.textContent = detail.text;
  tutorial.classList.toggle('visible', Boolean(detail.text));
});

game.addEventListener('finish', (event) => {
  const detail = (event as CustomEvent<{ isBest: boolean; rank: string; levelIndex: number }>).detail;
  renderLevels();
  if (detail.isBest) showToast(`NEW BEST · RANK ${detail.rank}`);
  else if (detail.levelIndex + 1 < LEVELS.length) showToast('LEVEL CLEAR');
});

game.addEventListener('campaignfinish', (event) => {
  const detail = (event as CustomEvent<{ ms: number; deaths: number; isBest: boolean }>).detail;
  renderCampaignRecord();
  resultTime.textContent = formatMs(detail.ms);
  resultDeaths.textContent = `×${detail.deaths}`;
  resultRecord.textContent = formatMs(game.save.data.campaignBestMs ?? detail.ms);
  resultMessage.textContent = detail.isBest ? 'NEW CAMPAIGN RECORD' : 'SIGNAL COMPLETE';
  window.setTimeout(() => show(resultsPanel), 0);
});

const pauseButton = document.querySelector<HTMLButtonElement>('#pause-button')!;
pauseButton.addEventListener('click', () => game.togglePause());

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
    showToast('FULLSCREEN NOT AVAILABLE');
  }
});

let installPrompt: InstallPromptEvent | null = null;
addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event as InstallPromptEvent;
  installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
  showToast('GLYPHHOOK INSTALLED');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.getMode() === 'playing') game.pause();
});

document.body.classList.toggle('reduced-motion', game.save.data.settings.reducedMotion);
refreshBindings();
renderLevels();
renderCampaignRecord();
game.start();

if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    if (hadController) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (sessionStorage.getItem('glyphhook-sw-reloaded') === '1') return;
        sessionStorage.setItem('glyphhook-sw-reloaded', '1');
        location.reload();
      }, { once: true });
    }

    void navigator.serviceWorker
      .register('./sw.js?v=0.4.4', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => undefined);
  });
}
