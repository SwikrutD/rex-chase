// Anonymous, cookieless analytics through Umami (https://umami.is).
// Loads only on the live site: never in the dev server, a local preview or the
// double-clicked build, and it fails silently when offline or blocked, so the
// game never waits on it. No personal data is sent: no IDs and nothing typed.
// Every event name and its fields are listed in CLAUDE.md under "Analytics".
import { ANALYTICS } from './config.js';

let loaded = false;

export function initAnalytics() {
  if (loaded || !ANALYTICS.websiteId) return;
  if (!import.meta.env.PROD || !location.protocol.startsWith('http')) return;
  if (!ANALYTICS.domains.includes(location.hostname)) return;
  loaded = true;
  const s = document.createElement('script');
  s.defer = true;
  s.src = ANALYTICS.src;
  s.dataset.websiteId = ANALYTICS.websiteId;
  s.dataset.domains = ANALYTICS.domains.join(',');
  document.head.appendChild(s);
}

/** Send a custom event. Safe to call anywhere; does nothing if Umami is not loaded. */
export function track(name, data) {
  try {
    if (loaded && window.umami && typeof window.umami.track === 'function') window.umami.track(name, data);
  } catch {
    /* analytics must never break the game */
  }
}

/** Group scores so reports read as a distribution rather than thousands of distinct values. */
export function scoreBand(score) {
  const edges = [100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 6600, 8000];
  for (let i = 0; i < edges.length; i++) if (score < edges[i]) return `${i ? edges[i - 1] : 0}-${edges[i] - 1}`;
  return `${edges[edges.length - 1]}+`;
}
