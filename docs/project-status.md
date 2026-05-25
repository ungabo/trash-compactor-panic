# Project Status

Last updated: 2026-05-25

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

The main visual target is the original concept gameplay image. The game uses that chamber as the playfield, adds a persistent mission/next-action panel, and overlays touch/click hotspots for:

- collecting crates
- jamming numbered compactor plates
- repairing/rerouting broken pipes
- using Emergency Jam
- managing pressure and timer failure

### Pipe Lab

A pipe-rotation sub-game using the provided pipe sheet as a single centered sprite source. Players tap/click tiles to rotate them and connect the inlet to the outlet, with visible flow progress and leak markers.

### Sorting Sprint

The first playable sorting prototype is preserved as a keyboard-first arcade sub-game with movement, pickup/drop, throwing, sorting, jam plate, pressure, timer, and restart.

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

- Run focused playtests on whether Main Chamber should become the campaign core.
- Expand Main Chamber from hotspot prototype into pipe repair/reroute events.
- Add touch controls or a mobile disclaimer path for Sorting Sprint.
- Keep end-state overlays navigable so completed/failed mini-games can always return to the menu.

## Verification Log

- `npm run build`: passed.
- `npm run smoke`: passed locally against `http://127.0.0.1:4173`.
- `npm run deploy`: uploaded `dist/` to `/sitesindevelopment/games/Trash Compactor`.
- `SMOKE_URL=https://sitesindevelopment.com/games/Trash%20Compactor/ npm run smoke`: passed against the public deployment.
- Current smoke covers root menu, Main Chamber, Pipe Lab, Sorting Sprint, desktop viewports, and mobile touch interaction.
- QA clarity pass added menu input labels, Main Chamber next-action guidance, Pipe Lab leak/flow feedback, and clearer Sorting Sprint keyboard objectives.
- Pipe Lab now asserts that pipe tiles render from `pipe-sheet.png`, and smoke tests verify menu navigation from end-state overlays.
