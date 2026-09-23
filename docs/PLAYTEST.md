# Glyphhook Playtest Matrix

This checklist is the acceptance pass for v0.3.1. CI covers TypeScript/Vite compilation; the in-game validator covers structural level errors. Hands-on feel still needs human input on the final deployed build.

## Core controls

- [ ] Keyboard: move left/right
- [ ] Keyboard: jump + coyote time
- [ ] Mouse: aim and hold hook
- [ ] Keyboard: release hook without losing tangential momentum
- [ ] Keyboard: reel in/out
- [ ] Keyboard: bubble
- [ ] Keyboard: R restarts current level
- [ ] Keyboard: Esc pauses/resumes
- [ ] F3 debug overlay toggles

## Mobile / touch

- [ ] Left stick + Jump simultaneously
- [ ] Left stick + Hook simultaneously
- [ ] Hold Hook before aiming; rope attaches when a valid anchor becomes available
- [ ] Hold Hook while dragging aim with another finger
- [ ] Bubble while moving
- [ ] Pause button freezes timer/physics
- [ ] Backgrounding the app pauses the run
- [ ] Portrait warning appears
- [ ] Landscape fills the viewport
- [ ] Fullscreen works where the browser exposes it

## Rope edge cases

- [ ] Direct anchor with unobstructed line
- [ ] One wrap around a platform corner
- [ ] Multiple sequential pivots
- [ ] Pivot unwrap after clearing an obstacle
- [ ] No rapid wrap/unwrap chatter at a corner
- [ ] Wall collision while rope is taut
- [ ] Reel-in while wrapped
- [ ] Release at high speed preserves momentum
- [ ] Death clears rope and pivots

## Feedback

- [ ] Hook range guide is visible but unobtrusive
- [ ] Candidate anchor is clearly highlighted
- [ ] Bubble cooldown percentage reaches 100%
- [ ] Activated checkpoint changes glyph
- [ ] High-speed trail appears
- [ ] Reduced Motion disables particles/trail/shake
- [ ] High Contrast remains readable
- [ ] Debug overlay does not obstruct controls

## Levels

- [ ] 00 Movement Lab
- [ ] 01 Runway
- [ ] 02 First Line
- [ ] 03 Release
- [ ] 04 Transfer
- [ ] 05 Bubble
- [ ] 06 Combo
- [ ] 07 Needle
- [ ] 08 Ascent
- [ ] 09 Final Circuit

For each campaign level verify: spawn is safe, exit is reachable, no forced blind jump, required anchor is within range, checkpoint does not spawn inside a wall/hazard, and completion unlocks the next level.

## PWA/update

- [ ] Fresh install works
- [ ] Second launch works offline after assets have been cached
- [ ] A new deployment updates the service worker
- [ ] Existing installed PWA refreshes to the new build instead of remaining on stale assets
