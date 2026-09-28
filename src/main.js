import '@fontsource/press-start-2p/400.css';
import './ui/style.css';
import { Game } from './game.js';
import { Hud } from './ui/hud.js';
import { Input } from './input.js';
import { initAnalytics } from './analytics.js';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function showFatal(title, detail) {
  const box = document.getElementById('fatal');
  box.querySelector('strong').textContent = title;
  box.querySelector('p').textContent = detail;
  box.hidden = false;
  document.getElementById('ui').hidden = true;
}

if (!hasWebGL()) {
  showFatal('3D is switched off', 'This browser has WebGL disabled or unavailable. Turn on hardware acceleration in your browser settings, or try another browser.');
} else {
  try {
    const canvas = document.getElementById('game');
    const hud = new Hud();
    const input = new Input(canvas);
    const game = new Game(canvas, hud, input);
    // Handy in the dev server console: __game.r.distance = 8000 to skip ahead.
    if (import.meta.env.DEV) window.__game = game;
  } catch (err) {
    console.error(err);
    showFatal('The game could not start', String(err && err.message ? err.message : err));
  }
}

initAnalytics();

// Installable and playable offline once visited. Only over http(s): a service
// worker cannot run from a file opened straight from disk.
if (import.meta.env.PROD && location.protocol.startsWith('http')) {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = './manifest.webmanifest';
  document.head.appendChild(link);
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
}
