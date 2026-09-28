// Achievements and the key-sequence easter eggs. Spoilers are in CLAUDE.md.

export const ACHIEVEMENTS = [
  { id: 'first', name: 'Hello, Offline World', desc: 'Start your first run.' },
  { id: 'k1', name: 'Four Digits', desc: 'Score 1000 points in one run.' },
  { id: 'roar', name: 'Use Your Words', desc: 'Fill the bone meter and roar.' },
  { id: 'lunch', name: 'Lunch Break', desc: 'Catch the caveman.' },
  { id: 'meteor', name: 'Look Up', desc: 'Survive a whole meteor shower.' },
  { id: 'allthree', name: 'Paleontologist', desc: 'Score 500 with every species.' },
  { id: 'shave', name: 'Close Shave', desc: 'Clear an obstacle by a hair.' },
  { id: 'chomper', name: 'Serial Chomper', desc: 'Catch the caveman three times in one run.' },
  { id: 'bonedry', name: 'Bone Dry', desc: 'Reach 2000 points without picking up a single bone.' },
  { id: 'kpg', name: 'K-Pg Survivor', desc: 'Outlive the dinosaurs.', secret: true },
  { id: 'konami', name: 'Solid Gold', desc: 'Enter a very old cheat code on the title screen.', secret: true },
  { id: 'retro', name: 'Pixel Purist', desc: 'On the title screen, type what you are right now.', secret: true },
  { id: 'truly', name: 'Truly Disconnected', desc: 'Play with your internet really off.', secret: true },
  { id: 'arms', name: 'Tiny Arms', desc: 'Reach for something ten times.', secret: true },
  { id: 'nap', name: 'Nap Time', desc: 'Leave the title screen alone for a while.', secret: true },
  { id: 'router', name: 'Reconnected', desc: 'Roar at a pterodactyl carrying something important.', secret: true },
  { id: 'notfound', name: 'Not Found', desc: 'Clear the cactus nobody could find.', secret: true },
  { id: 'parent', name: 'Proud Parent', desc: 'On the title screen, type what every dinosaur hatched from.', secret: true },
  { id: 'stargazer', name: 'Stargazer', desc: 'Take a long break under the night sky.', secret: true },
];

const SEQUENCES = {
  konami: ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'],
  offline: [...'offline'],
  egg: [...'egg'],
};

export class EggDetector {
  constructor(onMatch) {
    this.buf = [];
    this.onMatch = onMatch;
  }
  feed(key) {
    this.buf.push(key.toLowerCase());
    if (this.buf.length > 12) this.buf.shift();
    for (const [name, seq] of Object.entries(SEQUENCES)) {
      const tail = this.buf.slice(-seq.length);
      if (tail.length === seq.length && tail.every((k, i) => k === seq[i])) {
        this.buf = [];
        this.onMatch(name);
      }
    }
  }
}
