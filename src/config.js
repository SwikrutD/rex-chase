// Every tuning number for the game lives here. Units are world units (about
// one metre) and seconds. The rex stands still at REX_X; the world scrolls
// toward it along -x.

export const REX_X = -11;

// Camera framing. These set where the dino appears on screen; REX_X only
// moves it in world space (the camera follows), so tune these instead.
export const CAMERA = {
  // Horizontal spot for the dino during a run: 0 = left edge, 0.5 = centre.
  // Further right means less warning before obstacles arrive.
  dinoScreenX: 0.24,
  // Same for the title screen, measured across the space left of the title card.
  titleDinoScreenX: 0.34,
  // World units visible either side of the view centre (landscape, portrait).
  viewHalfWide: 18,
  viewHalfTall: 12,
  fov: 38,
};

export const SPEED = {
  start: 12,
  max: 30,
  perUnit: 0.0045, // speed gained per unit travelled
};

// Points per unit travelled. At the start speed this is about 9 points a second.
export const SCORE_PER_UNIT = 0.75;

export const DAY_NIGHT = {
  cycle: 700, // points per day or per night, like the original
  fade: 2.5, // seconds to cross-fade
};

export const METEOR = {
  first: 1500,
  every: 2000,
  duration: 10,
};

export const EXTINCTION_SCORE = 6600; // 66 million years, give or take

export const CAVEMAN = {
  first: 500,
  gapMin: 900,
  gapRand: 600,
  approach: 3.2, // screen units per second he loses to the rex
  throwChance: 0.55, // share of obstacle slots he fills with a throw while he is on screen
  throwReach: 7, // how far behind him a thrown rock lands, in world units
  throwMinFlight: 0.3, // shortest time a rock spends in the air, in seconds
  bonus: 250,
};

export const PTERO_FROM = 300; // score before pterodactyls appear
export const PTERO_EXTRA_SPEED = 1.5;

// Height of the bottom of each pterodactyl hitbox.
export const PTERO_Y = { low: 0.5, mid: 2.15, high: 3.75 };

export const OBSTACLE = {
  cactusS: { w: 0.8, h: 1.5, step: 0.95 },
  cactusL: { w: 1.0, h: 2.3, step: 1.1 },
  ptero: { w: 2.0, h: 1.0 },
  crater: { w: 2.4, h: 0.35 },
  rock: { w: 0.7, h: 0.7 },
};

export const BONE = { chance: 0.28, lowY: 0.5, highY: 3.4, size: 0.9 };

// Species stats. Hitboxes are relative to REX_X, x is the left edge.
export const SPECIES = {
  rex: {
    id: 'rex',
    name: 'Tyrannosaurus',
    blurb: 'The classic. Its roar shatters one obstacle and scares off every pterodactyl.',
    jumpV: 19,
    gHold: 40,
    gRelease: 85,
    gFast: 170,
    stand: { x: -1.3, w: 2.9, h: 3.1 },
    duck: { x: -1.7, w: 3.6, h: 1.85 },
    bonesForRoar: 3,
    roarShatter: 1,
    roarScaresBirds: true,
    roarPitch: 1,
    bars: { jump: 3, size: 4, roar: 4 },
  },
  raptor: {
    id: 'raptor',
    name: 'Velociraptor',
    blurb: 'Small and springy with the highest jump. Needs four bones to roar.',
    jumpV: 20.5,
    gHold: 40,
    gRelease: 85,
    gFast: 175,
    stand: { x: -1.0, w: 2.2, h: 2.45 },
    duck: { x: -1.3, w: 3.0, h: 1.5 },
    bonesForRoar: 4,
    roarShatter: 1,
    roarScaresBirds: false,
    roarPitch: 1.7,
    bars: { jump: 5, size: 2, roar: 2 },
  },
  trike: {
    id: 'trike',
    name: 'Triceratops',
    blurb: 'Heavy and low to the ground. Its roar is a horn charge that smashes two obstacles.',
    jumpV: 18.5,
    gHold: 40,
    gRelease: 85,
    gFast: 165,
    stand: { x: -1.8, w: 3.6, h: 2.6 },
    duck: { x: -2.0, w: 3.9, h: 1.8 },
    bonesForRoar: 3,
    roarShatter: 2,
    roarScaresBirds: false,
    roarPitch: 0.7,
    bars: { jump: 2, size: 5, roar: 5 },
  },
};

export const SPECIES_ORDER = ['rex', 'raptor', 'trike'];

// The hatchling easter egg: size and where it runs relative to the dino.
// dx is behind the dino during a run; titleDx puts it beside the dino on the title screen.
export const BABY = { scale: 0.45, dx: -5.8, titleDx: 2.6, z: 1.6, lag: 10 };

// The stargazer easter egg: pause at night for this long and the camera looks up.
export const STARGAZE = { after: 5, lookUp: 20 };

export const CAVEMAN_SKINS = {
  classic: { id: 'classic', name: 'Classic Grog', projectile: 'rock' },
  hunter: { id: 'hunter', name: 'Mammoth Hunter', projectile: 'snowball' },
  business: { id: 'business', name: 'Business Casual', projectile: 'mug' },
};

export const CAVEMAN_ORDER = ['classic', 'hunter', 'business'];
