// Keyboard and touch input. Held state is polled; presses are queued as
// named actions. Raw keys also go to listeners for the easter egg detector.

// Arrows and WASD mirror each other. What an action does depends on the
// screen: on the title, left/right pick the dinosaur and up/down the rival;
// during a run, up jumps, down ducks and right roars (as does Shift).
const ACTIONS = {
  Space: 'jump',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'duck', KeyS: 'duck',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'roar', ShiftRight: 'roar',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute',
  KeyH: 'trophies',
  KeyT: 'arms',
  Enter: 'start',
};

export class Input {
  constructor(target) {
    this.held = { jump: false, duck: false };
    this.queue = [];
    this.keyListeners = [];
    this.firstGesture = [];

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('button') && (e.code === 'Space' || e.code === 'Enter')) return;
      this.gesture();
      const a = ACTIONS[e.code];
      if (a) e.preventDefault();
      if (!e.repeat) {
        if (a === 'jump' || a === 'up') this.held.jump = true;
        if (a === 'duck') this.held.duck = true;
        if (a) this.queue.push(a);
        if (a === 'duck') this.queue.push('down');
      }
      // After queueing, so a cheat code can cancel the action its last key queued.
      this.keyListeners.forEach((f) => f(e.key, e.code));
    });
    window.addEventListener('keyup', (e) => {
      const a = ACTIONS[e.code];
      if (a === 'jump' || a === 'up') this.held.jump = false;
      if (a === 'duck') this.held.duck = false;
    });
    window.addEventListener('blur', () => { this.held.jump = false; this.held.duck = false; this.queue.push('blur'); });

    // Touch: tap to jump (hold for height), swipe down to duck, on-screen buttons for the rest.
    let startY = 0;
    let touchId = null;
    target.addEventListener('touchstart', (e) => {
      this.gesture();
      const t = e.changedTouches[0];
      touchId = t.identifier;
      startY = t.clientY;
      this.held.jump = true;
      this.queue.push('jump', 'tap');
      e.preventDefault();
    }, { passive: false });
    target.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== touchId) continue;
        if (t.clientY - startY > 40) { this.held.jump = false; this.held.duck = true; }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === touchId) { this.held.jump = false; this.held.duck = false; touchId = null; }
    };
    target.addEventListener('touchend', end);
    target.addEventListener('touchcancel', end);
    target.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.gesture();
      this.held.jump = true;
      this.queue.push('jump', 'tap');
    });
    window.addEventListener('mouseup', () => { this.held.jump = false; });
  }

  gesture() { if (this.firstGesture.length) { this.firstGesture.forEach((f) => f()); this.firstGesture = []; } }
  onFirstGesture(f) { this.firstGesture.push(f); }
  onKey(f) { this.keyListeners.push(f); }
  push(action) { this.queue.push(action); }
  /** Drop the most recent queued copy of an action (used when a key press turns out to be part of a cheat code). */
  cancelLast(action) {
    const i = this.queue.lastIndexOf(action);
    if (i >= 0) this.queue.splice(i, 1);
  }
  drain() { const q = this.queue; this.queue = []; return q; }
}
