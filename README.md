# Rex Chase

A 3D take on the no-internet dinosaur game. Pick a T-rex, a velociraptor or a triceratops, outrun cacti and pterodactyls, chase down a caveman who throws things back and survive the meteor showers. There are 19 trophies, and 10 of them are secret.

Built with Three.js and Vite. Every model and sound is generated in code, and once it has loaded it plays with no internet connection.

## Play

- **From disk:** open `dist/index.html`. No server or internet needed.
- **In development:** `npm install`, then `npm run dev` and open http://localhost:5173.

| Key | Action |
| --- | --- |
| Space, W or Up | Jump (hold for a higher jump) |
| S or Down | Duck, or fast-fall in the air |
| D or Right | Roar when the bone meter is full |
| A/D or Left/Right | Choose a dinosaur on the title screen |
| W/S or Up/Down | Choose the caveman's outfit on the title screen |
| P or Esc | Pause |
| M | Mute |
| H | Trophies |

On a phone, tap to jump, swipe down to duck and use the on-screen roar button. Landscape works best.

## Develop

```bash
npm install
npm run dev        # hot-reloading dev server
npm test           # unit tests, including a bot that proves every spawn pattern is beatable
npm run build      # static site in dist/
npm run preview    # serve dist/ locally
npm run check      # tests, then build
```

`CLAUDE.md` has the architecture, the tuning knobs and the rules that keep the game fair.

## Deploy

`dist/` is a static site that uses relative paths, so any static host works:

- **Netlify, Vercel or Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **GitHub Pages or any web server:** upload the contents of `dist/`.

The live site is https://rex.swikrut.com (GitHub Pages, DNS on Cloudflare). If the address ever changes, update `og:image`, `og:url` and the canonical link in `index.html`.

## Credits

Inspired by the offline dinosaur game in Google Chrome. All models, art and sounds in this project are original.
