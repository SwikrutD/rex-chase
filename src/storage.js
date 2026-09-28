// localStorage wrapper. Every call is guarded so a private window or blocked
// storage never breaks the game; it just forgets between sessions.
// Keep this key as is: renaming it would wipe every player's saved scores and trophies.
const KEY = 'rex-chase-offline:v1';

const DEFAULTS = {
  hi: 0,
  species: 'rex',
  caveman: 'classic',
  muted: false,
  golden: false,
  baby: false,
  retro: false,
  achievements: {},
  stats: { runs: 0, catches: 0, roars: 0 },
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const data = JSON.parse(raw);
    return { ...structuredClone(DEFAULTS), ...data, stats: { ...DEFAULTS.stats, ...(data.stats || {}) } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable; keep playing */
  }
}
