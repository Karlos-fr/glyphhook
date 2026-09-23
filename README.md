# Glyphhook

A minimalist ASCII-style web platformer focused on momentum, grappling, and precise movement. Swing between anchors, avoid hazards, and master the physics to reach the exit.

## v0.2

Glyphhook is built around a deterministic 120 Hz custom physics loop rather than a generic platformer physics engine. The grappling rope constrains radial motion while preserving tangential velocity, so releasing at the right point carries momentum into the next jump or hook.

### Features

- TypeScript + Vite + Canvas 2D
- Custom fixed-step platforming and rope physics
- Mouse/touch-directed grappling
- Rope reeling and tangential swing pumping
- Bubble impulse ability
- Checkpoints, hazards and exits
- Movement laboratory + campaign levels
- Main menu, level select and settings
- Timer, best times and S/A/B/C ranks
- LocalStorage persistence
- Best-run ghost replay
- Minimal synthesized sound effects
- Mobile virtual stick, aim zone, action buttons, haptics and fullscreen
- Automated GitHub Pages deployment

## Controls

### Desktop

- `A` / `D` or `←` / `→`: move / pump swing
- `Space` or `Z`: jump
- Hold left mouse button, `X`, or `Shift`: hook toward cursor
- `W` / `S` or `↑` / `↓`: reel rope in/out
- `C`: bubble
- `Esc`: menu

### Mobile

- Virtual analog stick: move / pump swing
- Drag on the right side of the playfield: aim
- `JUMP`, `HOOK`, `BUBBLE`: actions
- `⛶`: browser fullscreen where supported
- Landscape orientation recommended

## Physics tuning

All feel-critical values are centralized in `src/config/physics.ts`, including gravity, acceleration, max speed, jump velocity, hook range, reel speed, swing pumping and bubble impulse. This is intentionally separate from game logic so the reference-video feel can be calibrated without rewriting the engine.

## Level format

Levels live in `src/levels/index.ts` as character grids:

- `#` wall
- `@` player start
- `o` grappling anchor
- `^` hazard
- `!` checkpoint
- `E` exit
- `.` empty space
- other characters are rendered as dim instructional text

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## GitHub Pages

Pushes to `main` run `.github/workflows/deploy.yml`, build with the `/glyphhook/` base path, and deploy `dist/` to GitHub Pages.
