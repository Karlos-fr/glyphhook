# Glyphhook

A minimalist ASCII-style web platformer focused on momentum, grappling, and precise movement.

## v0.4.0 — Single-screen 16:9 Rooms

The campaign has been rebuilt around the actual grapple physics instead of long scrolling test corridors.

- Every level is exactly 64 × 36 logical cells (1152 × 648 at 18 px/cell), i.e. a true 16:9 room
- The whole room is always fitted and centered in the viewport; there is no gameplay scrolling
- All ten rooms have been redesigned around run-up, jump, active grapple lift, swing, release, transfer and Bubble correction
- Holding Hook now automatically reels the rope in and gives a small attach impulse, so the grapple can genuinely lift the player
- Early grapple levels have comfortable starting-anchor range instead of edge-of-range placements
- Level validation now rejects rooms whose first anchor cannot be reached from spawn
- World rendering still uses real text glyphs; glyphs are packed more tightly inside each logical cell to match the reference video's dense ASCII look
- Rope rendering uses short text segments again rather than a smooth vector line

## v0.3.4 — Gameplay Corrections

- Restored the original gameplay/level colors; the spectral art direction now applies to UI and menus only
- Added `Arrow Up` as an alternate jump key
- Reworked Runway's first lava sequence so every jump is within the current physics envelope
- Verified FIRST LINE's first grapple anchor is within range and has direct line of sight

## v0.3.3 — Spectral Monitor Art Direction

This pass replaces the generic neon look with a quieter, more distinctive visual language inspired by old terminals, industrial monitors and signal equipment.

- Removed the duplicated in-game shortcut strip; the Movement Lab tutorial is now the only control teaching surface
- HUD reduced to level identity, mechanic, timer, deaths, records and Bubble recovery
- New muted ink / graphite / brass / sage / brick / dusty-violet palette
- Glow reduced to a tiny functional accent instead of a global visual effect
- Added subtle scanline/signal grain without a heavy VHS filter
- Hook target preview is a restrained target ring, visually distinct from the active rope
- Menus, settings, mobile controls, results and PWA icon now use the same spectral-monitor language
- Fixed a settings lifecycle bug where the visibility listener could be registered repeatedly
- PWA cache bumped to v0.3.3

## v0.3.1 — Playability & Polish

This pass hardens the existing game instead of adding a new gameplay system.

- Real pause/resume flow; `Esc` pauses instead of quitting
- Mobile Pause button and automatic pause when the app goes to the background
- Progressive Movement Lab tutorial driven by actual player actions
- Mobile Hook can stay held while the player aims; it retries anchor acquisition until a valid target exists
- Rope pivot hysteresis reduces corner wrap/unwrap chatter
- Visible hook range and candidate guide
- Active checkpoint marker and Bubble cooldown percentage
- Optional `F3` debug overlay with FPS, position, velocity, speed, rope length, pivots and anchor
- Structural level validation at startup
- PWA cache versioned to v0.3.1 with no-cache service-worker update checks

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
- `Space` or `↑`: jump
- Hold `X` or left mouse: hook toward highlighted anchor
- `W` / `S`: reel rope in/out
- `C`: bubble
- `R`: restart current level
- `Esc`: pause/resume
- `F3`: toggle developer debug overlay

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
