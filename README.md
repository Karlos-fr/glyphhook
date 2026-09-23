# Glyphhook

A minimalist ASCII-style web platformer focused on momentum, grappling, and precise movement.

## v0.3 — Game Feel

Glyphhook uses a deterministic 120 Hz custom physics loop. The v0.3 pass focuses on movement quality, readable aiming, rope/world interaction, progression, mobile play and offline installation.

### Highlights

- Responsive full-screen renderer: the canvas and logical world scale to the entire viewport
- Tuned gravity, acceleration, jumping, swing pumping and bubble impulse
- Rope wrapping/unwrapping around solid tile corners
- Pre-highlighted hook target before attachment
- Momentum-preserving grappling with rope reeling
- High-speed player trail, hook/bubble/checkpoint particles and optional camera shake
- 9-level progression campaign + movement lab
- Level unlocking, best time, death records and S/A/B/C ranks
- Full-campaign timer and best campaign record
- Local best-run ghost
- Keyboard rebinding
- Gamepad support (left stick move, right stick aim, A jump, RT hook, X bubble)
- Mobile analog movement, touch aim, dedicated Jump/Hook/Bubble controls, haptics and fullscreen
- Accessibility settings: reduced motion, high contrast, screen shake, HUD and audio controls
- Minimal ambient audio and synthesized action sounds
- PWA manifest + service worker for install/offline use after first load
- GitHub Actions PR validation and Pages deployment

## Controls

### Desktop

Defaults are rebindable in Settings.

- `A` / `D`: move / pump swing
- `Space`: jump
- Hold `X` or left mouse: hook toward highlighted anchor
- `W` / `S`: reel rope in/out
- `C`: bubble
- `R`: restart current level
- `Esc`: menu

### Gamepad

- Left stick: move / swing pump
- Right stick: aim
- A / Cross: jump
- RT / R2: hook
- X / Square: bubble
- LB/RB-style controls are not required; keyboard/touch reeling remains available

### Mobile

- Left analog pad: movement
- Right-side playfield: aim
- Dedicated Jump / Hook / Bubble buttons
- Fullscreen button attempts landscape lock where supported

## Physics tuning

Feel-critical constants remain centralized in `src/config/physics.ts`. The rope path itself is handled in `src/gameplay/player.ts` using collision queries from `src/gameplay/world.ts`.

## Development

```bash
npm install
npm run dev
npm run build
```

## GitHub Pages

Pushes to `main` build with the `/glyphhook/` base path and deploy `dist/` to GitHub Pages. Pull requests run the same TypeScript/Vite build without deploying.
