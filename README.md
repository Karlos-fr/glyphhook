# Glyphhook

A minimalist ASCII-style web platformer focused on momentum, grappling, and precise movement. Swing between anchors, avoid hazards, and master the physics to reach the exit.

## Stack

- TypeScript
- Vite
- Canvas 2D
- Custom fixed-step movement / rope physics
- GitHub Pages via GitHub Actions

## Controls

### Desktop

- `A` / `D` or `←` / `→`: move
- `Space` or `Z`: jump
- Hold left mouse button, `X`, or `Shift`: hook toward the cursor
- `W` / `S` or `↑` / `↓`: reel rope in/out
- `C`: bubble burst

### Mobile

- Touch `◀` / `▶` to move
- `JUMP`, `HOOK`, and `BUBBLE` use the on-screen buttons
- Touch/drag anywhere on the playfield to aim the hook and bubble
- Landscape orientation is recommended

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

Every push to `main` runs `.github/workflows/deploy.yml` and deploys the `dist/` output to GitHub Pages.

For a new repository, enable **Settings → Pages → Build and deployment → Source: GitHub Actions** once. The workflow builds with the `/glyphhook/` base path.

## Level format

Levels live in `src/levels.ts` as character grids:

- `#` wall
- `@` player start
- `o` grappling anchor
- `^` hazard
- `!` checkpoint
- `E` exit
- `.` empty space
