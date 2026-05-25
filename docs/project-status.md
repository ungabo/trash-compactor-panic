# Project Status

Last updated: 2026-05-24

## Role Model

Codex is acting as lead developer and project manager. Sub-agents are used for bounded sidecar work such as asset analysis, QA checks, and disjoint mini-game ownership. The lead keeps the critical path local: app structure, integration, test, deploy, and release notes.

## Repository

- Local work folder: `D:\__MY APPS\trash compactor`
- GitHub repo: `https://github.com/ungabo/trash-compactor-panic`
- Visibility: public
- Primary stack: Vite, TypeScript, Phaser 3 plus DOM-based touch mini-games

## Deployment

- Remote host details are read from the local desktop SFTP info file.
- Remote test folder: `/sitesindevelopment/games/Trash Compactor`
- Public test URL: `https://sitesindevelopment.com/games/Trash%20Compactor/`

## Current App Shape

The app opens to a root menu with three selectable mini-games.

### Main Chamber

The main visual target is the original concept gameplay image. The game uses that chamber as the playfield and overlays touch/click hotspots for:

- collecting crates
- jamming numbered compactor plates
- repairing/rerouting broken pipes
- using Emergency Jam
- managing pressure and timer failure

### Pipe Lab

A pipe-rotation sub-game using cropped pipe assets from the provided pipe sheet. Players tap/click tiles to rotate them and connect the inlet to the outlet.

### Sorting Sprint

The first playable sorting prototype is preserved as an arcade sub-game with keyboard movement, pickup/drop, throwing, sorting, jam plate, pressure, timer, and restart.

## Milestone Sequence

1. Mini-game collection shell: menu, mode switching, shared deploy/test flow.
2. Main Chamber fidelity: make the concept-art chamber more interactive while staying visually close to the mockup.
3. Pipe Lab progression: multiple route puzzles, colored pipe routes, locked/broken pipe events.
4. Sorting Sprint polish: better controls, art pass, and clearer scoring.
5. Campaign wrapper: sequence the mini-games into levels/chambers with shared pressure and results.

## Sub-Agent Log

- Asset/visual analyst: inspected reference material and confirmed current PNG sheets are not transparent; recommended treating them as reference/source until an asset cleanup pass.
- QA/playtest planner: produced initial acceptance criteria and browser/headless smoke-test flow.
- Pipe Lab owner: converted the pipe puzzle to use cropped pipe PNG assets and verified desktop click/mobile tap behavior.
- Sorting Sprint owner: scoped Sorting Sprint as a sub-game and gated its updates while inactive.

## Current Next Actions

- Deploy the three-game menu build.
- Collect playtest notes on which mini-game should become the campaign core.
- Improve Main Chamber interactions without drifting from the concept art.

## Verification Log

- `npm run build`: passed.
- `npm run smoke`: passed locally against `http://127.0.0.1:4173`.
- `npm run deploy`: uploaded `dist/` to `/sitesindevelopment/games/Trash Compactor`.
- `SMOKE_URL=https://sitesindevelopment.com/games/Trash%20Compactor/ npm run smoke`: passed against the public deployment.
- Current smoke covers root menu, Main Chamber, Pipe Lab, Sorting Sprint, desktop viewports, and mobile touch interaction.
