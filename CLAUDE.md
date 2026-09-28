# Rex Chase

A 3D take on Chrome's no-internet dinosaur game, built with Three.js and Vite. It keeps the original's side-on jump-and-duck loop and its 100-point chime. The day/night swap and moon phases carry over too. On top of that it adds three playable species, a caveman rival with three skins, a bone-powered roar, meteor showers and a pile of easter eggs. Everything in the game is procedural: no model files, no image files and no audio files. The only images are the app icons and the share preview in `public/`.

## Commands

```bash
npm install        # once
npm run dev        # dev server at http://localhost:5173 with hot reload
npm test           # vitest: physics, rules, fairness bot, easter eggs
npm run build      # writes dist/: a self-contained index.html plus icons, manifest and service worker
npm run preview    # serve the build at http://localhost:4173 (closest thing to the deployed site)
npm run check      # tests then build; run before every deploy
```

`dist/` is committed on purpose. The build inlines every script, style and font into `dist/index.html`, so that one file opens with a double-click from disk with no server and no internet. The other files in `dist/` only matter on a web host. Rebuild after any change you want playable that way.

## Layout

```
index.html              DOM for the HUD, title card and overlays; meta and share tags
vite.config.js          single-file build (vite-plugin-singlefile), service worker stamp, vitest config
public/                 copied into dist/ as is
  sw.js                 service worker: network first, cache fallback, so the site works offline
  manifest.webmanifest  install metadata (fullscreen, landscape)
  icon-*.png, apple-touch-icon.png, og-image.png   app icons and the link preview image
README.md               player-facing overview plus deploy steps
.github/workflows/ci.yml   runs tests and the build on every push
src/
  main.js               WebGL check, bootstraps Hud, Input and Game, registers the service worker;
                        exposes window.__game in dev
  config.js             ALL tuning numbers: speeds, species stats, event scores, sizes
  game.js               state machine, spawning, collisions, roar, rival, events, camera
  input.js              keyboard and touch -> held state + queued actions. Arrows and WASD
                        mirror each other; right/D means "next dinosaur" on the title
                        and "roar" during a run (as does Shift; R is deliberately unbound)
  audio.js              WebAudio synth; every sound is generated in code
  storage.js            guarded localStorage (hi score, choices, trophies)
  eastereggs.js         achievement list and key-sequence detector
  logic/                PURE modules with no Three.js; these are what the tests cover
    physics.js          jump integration and analytic jump helpers
    collide.js          AABB boxes, forgiveness shrink, dino hitbox
    rules.js            speed, score, day/night, meteor timing, obstacle picker, gaps, PRNG
  entities/
    kit.js              primitive helpers, blinking/KO eyes, MaterialSet (gold skin)
    dinos.js            T-rex, Velociraptor and Triceratops rigs + the Dino wrapper
    caveman.js          caveman rig with classic, hunter and business skins
    obstacles.js        cacti (and the 404 sign), pterodactyls, craters, bones, projectiles
  world/world.js        sky shader, sun, moon phases, stars, ground, lane, parallax, meteors
  fx/particles.js       pooled dust, debris and sparkles
  ui/hud.js, style.css  score, roar meter, toasts, title card, pause, game over, trophies
tests/                  vitest specs
```

## How the game works

- **World axes.** x runs along the track, y is up and z points at the camera. The dino never moves in x. It stands at `REX_X` (-11) and the world scrolls toward it along -x. The lane is z = 0; background decor sits at z <= -7 and the rival caveman runs at z = -1.6 so he never clips through cacti.
- **Hitboxes** are 2D `{x, y, w, h}` boxes with x,y at the bottom-left, and an obstacle group's origin is the left edge of its hitbox. Both sides are shrunk by `HIT_FORGIVE` before testing so near misses feel fair.
- **Game logic runs on units travelled, not frames.** `speedAt(distance)` and `scoreAt(distance)` drive everything. Score is `scoreAt(distance) + bonus`, and bonuses come from catching the caveman or surviving K-Pg.
- **Spawning** happens when `r.distance >= r.nextSpawnAt`. `nextObstacle()` picks the obstacle and `gapAfter()` sets the distance to the next one.
- **Caveman throws are planned slots.** While he is on screen, `rivalCanThrow()` lets `nextObstacle()` turn a slot into a `proj` (the first one always, then `CAVEMAN.throwChance`). The slot starts invisible at the spawn line like any obstacle. When it passes him he throws back over his shoulder, and the rock flies for `throwReach / speed` seconds (at least `throwMinFlight`) and lands exactly on the slot. It only becomes solid on landing, so throws obey the same gap rules as cacti. If he is caught first, pending slots are dropped.
- **Poses.** `Dino.update()` blends weights for run, air, duck and sleep and passes them to the species' `pose()`. Knockouts (topple + X eyes) and the gold skin are handled in the wrapper, so a new species only has to build a rig and write `pose()`.
- **Camera.** Everything is set in `CAMERA` in `config.js`. `dinoScreenX` is where the dino sits across the screen during a run (0 is the left edge, 0.5 the centre), and `titleDinoScreenX` does the same on the title screen, measured across the space the title card leaves free. `calibrate()` in `game.js` projects the dino through the real camera and corrects the aim, so the number you set is where it lands even though the camera looks at the lane at an angle. Changing `REX_X` does not move the dino on screen, because the camera follows it. The spawn line is always just past the right edge, so moving the dino right shortens the warning before obstacles arrive.
- **Performance.** `prewarm()` compiles every shader at startup so the first pterodactyl or meteor never stutters. `watchPerformance()` lowers the resolution in two steps (and the shadow map on the second) if frames average slower than 45 fps over 3 seconds. Camera shake and the FOV kick are toned down under `prefers-reduced-motion`.

## Invariants: do not break these

1. **Every spawn must be beatable by the selected species.** `nextObstacle()` shrinks cactus groups until `clearable()` passes, and pterodactyls must be clearable, duckable or passable underneath. The `fairness` test runs a perfect-timing bot with all three species to 8000 points on three seeds. If you touch jump stats, obstacle sizes, speeds or gaps, run `npm test` and keep that test green. Do not loosen the test to make it pass.
2. **Keep logic/ free of Three.js and the DOM** so it stays unit-testable in Node.
3. **Nothing may hide the lane.** Anything between the camera and z = 0 must stay pebble-sized.
4. **Offline first.** No CDN links, remote fonts or fetches. The Press Start 2P font comes from `@fontsource` and is inlined by the build.
5. **Storage is best effort.** Every localStorage access goes through `storage.js`, which swallows errors.
6. **Caveman throws stay planned slots.** Never spawn a projectile outside `nextObstacle()`; that is what made throws both rare and risky before.
7. **Original art only.** The game is inspired by Chrome's offline dinosaur, but the icons, favicon and billboard use its own roaring-rex mark. Do not copy Google's sprite or other third-party artwork into the project.

## Common changes

- **Move the dino on screen:** change `CAMERA.dinoScreenX` in `config.js` (for example 0.3 to sit further right). Use `CAMERA.titleDinoScreenX` for the title screen.
- **Tune difficulty:** edit `config.js` (`SPEED`, `SPECIES`, `OBSTACLE`, `PTERO_*`, `CAVEMAN`) and then run the tests.
- **Make the caveman throw more or less:** `CAVEMAN.throwChance` (share of slots) and `CAVEMAN.throwReach` (how far behind him rocks land).
- **Add a species:** write `buildX()` in `dinos.js` that returns `{ root, M, eyes, mouth, headTop, pose, scale, offsetX, strideLen }`. Register it in `BUILDERS`, add stats to `SPECIES` and append the id to `SPECIES_ORDER`. The fairness test picks it up automatically. Match the rig's visual size to its `stand` and `duck` hitboxes.
- **Add a caveman skin:** add a palette to `SKINS` in `caveman.js`, add the item and body branches, then add an entry to `CAVEMAN_SKINS` and `CAVEMAN_ORDER`. `projectile` must be a kind `makeProjectile()` knows.
- **Add an obstacle:** return a spec from `nextObstacle()` (update `clearable` reasoning if it is not a ground or air box), build the mesh in `obstacles.js` and wire it into `spawnObstacle()`.
- **Add an achievement:** add it to `ACHIEVEMENTS` and call `this.unlock('id')` where it is earned.
- **Add a sound:** add a function to `sfx` in `audio.js` built from `tone()` and `noise()`.

## Debugging

In `npm run dev` the game is on `window.__game`:

```js
__game.die = () => {}                 // god mode for the current run
__game.r.distance = 1490 / 0.75       // jump to just before the first meteor shower
__game.r.distance = 470 / 0.75        // just before the first caveman
__game.r.caveNext = 0                 // bring the caveman out now
__game.r.meter = 4                    // fill the roar meter
__game.world.nightTarget = 1          // force night
__game.titleIdle = 26                 // fall asleep on the title screen
```

The dev server can also be screenshot-tested headless with Playwright. Software WebGL runs at a few frames a second and `dt` is clamped to 50 ms, so wait on game state with `waitForFunction` rather than fixed sleeps.

## Manual test checklist

- The title screen shows the dino and caveman beside the card, both on a wide window and in phone portrait.
- Arrow keys cycle species and rivals, and the choices survive a reload.
- Space starts a run. Hold for a high jump, tap for a low one, and down fast-falls.
- The score chimes every 100 points. Night falls at 700 with a new moon phase each night.
- Pterodactyls appear after 300. Low ones must be jumped, mid ones ducked, and high ones cleared by running under.
- The caveman appears at 500. He throws his skin's projectile (sandstone rock, snowball or coffee mug) back over his shoulder one to three times, and gives +250 when caught.
- The meteor shower starts at 1500 with craters on the track and a red sky.
- Collecting bones fills the meter, and D or the right arrow roars and shatters obstacles. R does nothing.
- On death the dino topples with X eyes. Space restarts and Esc goes to the title.
- P pauses, M mutes and H opens trophies. Switching tabs auto-pauses.
- After a deploy: `npm run preview` or the live site loads, then reloads with the network off (the service worker serves it).

## Trophies

19 in total, 10 of them secret (listed in `ACHIEVEMENTS` in `eastereggs.js`). The skill trophies without an easter egg are: Hello Offline World, Four Digits, Use Your Words, Lunch Break, Look Up, Paleontologist, plus Close Shave (clear an obstacle while touching its unforgiving hitbox; tracked with `o.grazed`), Serial Chomper (three caveman catches in one run) and Bone Dry (2000 points with no bones collected).

## Easter eggs (spoilers)

| Trigger | Effect | Trophy |
| --- | --- | --- |
| Konami code on the title screen (up up down down left right left right B A) | Toggles a gold skin on every species | Solid Gold |
| Type `offline` on the title screen or while paused | Toggles retro mode: low-res, pixelated and greyscale like the original, with a dial-up noise | Pixel Purist |
| Actually go offline | A "No internet" billboard with the game's rex mark appears in the background. On the deployed site the game still loads offline thanks to the service worker | Truly Disconnected |
| Press T ten times | The dino flails its tiny arms (T for tiny; A is now a movement key) | Tiny Arms |
| Leave the title screen for 20 s | The dino falls asleep with floating Zs and yawns when woken | Nap Time |
| Score around 400 | A cactus with a "404" sign spawns | Not Found (clear it) |
| A pterodactyl carrying a Wi-Fi router (1 in 6) | Roar at it | Reconnected |
| Reach 6600 (66 million years) | A giant meteor hits the horizon. You get a whiteout, +660 points and a party hat | K-Pg Survivor |
| Type `egg` on the title screen | A hatchling of your species pops out and runs beside you for good, copying your jumps a beat late. Type it again to put it to bed. Cosmetic only (`BABY` in config.js) | Proud Parent |
| Pause at night and wait 5 s | The pause text fades and the camera tilts up to a constellation traced from the game's rex mark (`STARGAZE` in config.js) | Stargazer |

Other touches: the background fossil ribcage, the moon cycling through phases each night like the original, the triceratops shaking the camera when it lands and the X eyes on a knockout.

## Style

- UI copy is plain and short. No em dashes, and no serial commas.
- Keep the procedural look: low-poly primitives with `flatShading`, built in code.
- Put new numbers in `config.js`, not inline.

## Deploying

`npm run build` produces a static site in `dist/`. Any static host works, and the build uses relative paths, so it also works from a subfolder such as a GitHub Pages project URL.

- **Netlify, Vercel or Cloudflare Pages:** build command `npm run build`, output directory `dist`, Node 20 or newer.
- **GitHub Pages or your own server:** upload the contents of `dist/`.
- **Live site:** https://rex.swikrut.com, deployed by `.github/workflows/deploy.yml` to GitHub Pages on every push to `main`. DNS is a Cloudflare CNAME `rex` -> `swikrutd.github.io`, set to DNS only (grey cloud). `og:image`, `og:url` and the canonical link in `index.html` use absolute URLs on that domain, because most link-preview crawlers ignore relative image URLs; update them if the domain changes.
- The service worker is network first, so players get new deploys on their next online load. Each build stamps a new cache name, and old caches are cleared on activation.
- Serve over HTTPS; service workers and install prompts do not run on plain HTTP (localhost excepted).

## Key bindings and typed eggs

Typed easter eggs (`offline`, `egg`) must only use letters with no action bound: W A S D P M H T are taken on the title screen. The Konami code ends in A, which also means "previous dinosaur", so `onEgg('konami')` calls `input.cancelLast('left')`; key listeners run after the action is queued so that cancel works.
