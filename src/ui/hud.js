// DOM overlay: score, roar meter, toasts, title card, pause, game over, trophies.
import { SPECIES, CAVEMAN_SKINS } from '../config.js';
import { ACHIEVEMENTS } from '../eastereggs.js';

const $ = (id) => document.getElementById(id);
const pad = (n) => String(Math.max(0, Math.floor(n))).padStart(5, '0');

export class Hud {
  constructor() {
    this.el = {
      score: $('score'), hi: $('hiVal'), cur: $('curVal'), meter: $('meter'), pips: $('pips'),
      toasts: $('toasts'), flash: $('flash'), title: $('title'), pause: $('pause'), over: $('over'),
      final: $('finalScore'), newBest: $('newBest'), trophies: $('trophies'), trophyList: $('trophyList'),
      trophyCount: $('trophyCount'), mute: $('btnMute'), spName: $('spName'), spBlurb: $('spBlurb'),
      spBars: $('spBars'), cvName: $('cvName'), tRoar: $('tRoar'),
    };
    this.handlers = {};
    const bind = (id, name) => {
      const b = $(id);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        b.blur(); // keep Space for jumping, not re-clicking the button
        this.emit(name);
      });
      b.addEventListener('mousedown', (e) => e.stopPropagation());
      b.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    };
    bind('spPrev', 'left'); bind('spNext', 'right');
    bind('cvPrev', 'down'); bind('cvNext', 'up');
    bind('btnStart', 'start'); bind('btnReplay', 'start');
    bind('btnTrophies', 'trophies'); bind('btnCloseTrophies', 'trophies');
    bind('btnMute', 'mute'); bind('tRoar', 'roar');
    const duck = $('tDuck');
    duck.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); this.emit('duckDown'); }, { passive: false });
    duck.addEventListener('touchend', (e) => { e.stopPropagation(); this.emit('duckUp'); });
    this.lastScore = -1;
    this.lastMeter = '';
  }

  on(name, f) { this.handlers[name] = f; }
  emit(name) { if (this.handlers[name]) this.handlers[name](); }

  setScore(score, hi) {
    const s = Math.floor(score);
    if (s !== this.lastScore) { this.el.cur.textContent = pad(s); this.lastScore = s; }
    this.el.hi.textContent = pad(hi);
  }
  flashScore() {
    this.el.score.classList.remove('blinking');
    void this.el.score.offsetWidth;
    this.el.score.classList.add('blinking');
  }

  setMeter(n, max, visible) {
    this.el.meter.hidden = !visible;
    const key = `${n}/${max}`;
    if (key === this.lastMeter) return;
    this.lastMeter = key;
    this.el.pips.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const p = document.createElement('i');
      p.className = 'pip' + (i < n ? ' on' : '');
      this.el.pips.appendChild(p);
    }
    const ready = n >= max;
    this.el.meter.classList.toggle('ready', ready);
    this.el.tRoar.disabled = !ready;
  }

  toast(text, sub = '', kind = '', life = 2.4) {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.style.setProperty('--life', `${life}s`);
    t.textContent = text;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; t.appendChild(s); }
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
    setTimeout(() => t.remove(), (life + 0.5) * 1000);
  }

  whiteout(ms = 600) {
    this.el.flash.classList.add('on');
    setTimeout(() => this.el.flash.classList.remove('on'), ms);
  }

  setNight(on) { document.body.classList.toggle('night', on); }
  setRunning(on) { document.body.classList.toggle('running', on); }
  setRetro(on) { document.body.classList.toggle('retro', on); }

  showTitle(on) { this.el.title.hidden = !on; }
  setSpecies(id) {
    const s = SPECIES[id];
    this.el.spName.textContent = s.name;
    this.el.spBlurb.textContent = s.blurb;
    this.el.spBars.innerHTML = '';
    for (const [label, v] of [['JUMP', s.bars.jump], ['SIZE', s.bars.size], ['ROAR', s.bars.roar]]) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      for (let i = 0; i < 5; i++) { const b = document.createElement('i'); if (i < v) b.className = 'on'; dd.appendChild(b); }
      this.el.spBars.append(dt, dd);
    }
  }
  setCaveman(id) { this.el.cvName.textContent = CAVEMAN_SKINS[id].name; }
  setGoldenName(id, golden) {
    this.el.spName.textContent = (golden ? 'Golden ' : '') + SPECIES[id].name;
  }

  showPause(on) { this.el.pause.hidden = !on; }
  showOver(on, score = 0, newBest = false) {
    this.el.over.hidden = !on;
    if (on) {
      this.el.final.textContent = `SCORE ${pad(score)}`;
      this.el.newBest.hidden = !newBest;
    }
  }

  setMuted(m) { this.el.mute.textContent = m ? 'SOUND OFF' : 'SOUND ON'; }

  renderTrophies(unlocked) {
    const got = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
    this.el.trophyCount.textContent = `${got}/${ACHIEVEMENTS.length}`;
    this.el.trophyList.innerHTML = '';
    for (const a of ACHIEVEMENTS) {
      const li = document.createElement('li');
      const has = !!unlocked[a.id];
      li.className = has ? '' : 'locked';
      const ico = document.createElement('div');
      ico.className = 'ico';
      ico.textContent = has ? '★' : '?';
      const body = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = has || !a.secret ? a.name : 'Secret trophy';
      const desc = document.createElement('span');
      desc.textContent = a.desc;
      body.append(name, desc);
      li.append(ico, body);
      this.el.trophyList.appendChild(li);
    }
  }
  toggleTrophies(force) {
    const show = force ?? this.el.trophies.hidden;
    this.el.trophies.hidden = !show;
    return show;
  }
  trophiesOpen() { return !this.el.trophies.hidden; }
}
