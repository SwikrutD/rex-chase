// Every sound is synthesized with WebAudio, so there are no audio files.
// The context is created on the first key press or tap, as browsers require.

let ctx = null;
let master = null;
let muted = false;
let noiseBuf = null;

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02);
}
export const isMuted = () => muted;

function tone({ type = 'square', f0, f1 = f0, dur = 0.1, vol = 0.3, at = 0, attack = 0.005 }) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

function noise({ dur = 0.2, vol = 0.3, f0 = 800, f1 = f0, q = 1, type = 'lowpass', at = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

export const sfx = {
  jump() { tone({ f0: 420, f1: 880, dur: 0.12, vol: 0.18 }); },
  land() { tone({ type: 'sine', f0: 120, f1: 50, dur: 0.12, vol: 0.35 }); noise({ dur: 0.08, vol: 0.12, f0: 400 }); },
  step() { tone({ type: 'sine', f0: 90, f1: 45, dur: 0.07, vol: 0.12 }); },
  point() { tone({ f0: 990, dur: 0.07, vol: 0.12 }); tone({ f0: 1320, dur: 0.12, vol: 0.12, at: 0.08 }); },
  pickup() { [660, 880, 1320].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.1, vol: 0.18, at: i * 0.05 })); },
  roarReady() { tone({ type: 'triangle', f0: 440, f1: 660, dur: 0.18, vol: 0.2 }); tone({ type: 'triangle', f0: 660, f1: 990, dur: 0.2, vol: 0.2, at: 0.12 }); },
  roar(pitch = 1) {
    tone({ type: 'sawtooth', f0: 140 * pitch, f1: 70 * pitch, dur: 0.9, vol: 0.35, attack: 0.05 });
    tone({ type: 'square', f0: 95 * pitch, f1: 55 * pitch, dur: 0.8, vol: 0.18, attack: 0.08 });
    noise({ dur: 0.9, vol: 0.35, f0: 1800 * pitch, f1: 300, q: 2 });
  },
  shatter() { noise({ dur: 0.35, vol: 0.4, f0: 3000, f1: 400, type: 'bandpass', q: 0.8 }); tone({ type: 'triangle', f0: 300, f1: 90, dur: 0.25, vol: 0.2 }); },
  die() { tone({ f0: 440, f1: 110, dur: 0.5, vol: 0.25 }); noise({ dur: 0.3, vol: 0.2, f0: 600, f1: 100 }); },
  yell() {
    const o = tone({ type: 'square', f0: 520, f1: 380, dur: 0.6, vol: 0.12, attack: 0.03 });
    if (o) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 11; lg.gain.value = 30;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(); lfo.stop(ctx.currentTime + 0.65);
    }
  },
  caught() { tone({ type: 'sine', f0: 200, f1: 900, dur: 0.25, vol: 0.25 }); [523, 659, 784, 1046].forEach((f, i) => tone({ f0: f, dur: 0.1, vol: 0.14, at: 0.2 + i * 0.07 })); },
  throwIt() { noise({ dur: 0.15, vol: 0.15, f0: 2000, f1: 600, type: 'bandpass' }); },
  boom(big = false) {
    tone({ type: 'sine', f0: big ? 70 : 110, f1: 28, dur: big ? 2.2 : 0.7, vol: big ? 0.6 : 0.3 });
    noise({ dur: big ? 2.5 : 0.8, vol: big ? 0.6 : 0.25, f0: big ? 1200 : 900, f1: 60 });
  },
  achievement() { [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.14, vol: 0.16, at: i * 0.08 })); },
  menu() { tone({ f0: 660, dur: 0.05, vol: 0.12 }); },
  yawn() { tone({ type: 'sawtooth', f0: 180, f1: 110, dur: 0.7, vol: 0.15, attack: 0.2 }); },
  modem() { // For the retro easter egg.
    [1200, 2100, 1800, 2400, 1300, 980].forEach((f, i) => tone({ type: 'sine', f0: f, f1: f * 1.02, dur: 0.12, vol: 0.1, at: i * 0.1 }));
    noise({ dur: 0.6, vol: 0.12, f0: 3000, f1: 2500, type: 'bandpass', q: 4, at: 0.6 });
  },
};
