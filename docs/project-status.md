# Project Status

Last updated: 2026-05-24

## Role Model

Codex is acting as lead developer and project manager. Sub-agents are used for bounded sidecar work such as asset analysis, QA checklists, and future disjoint implementation slices. The lead keeps the critical path local: architecture, integration, test, deploy, and release notes.

## Repository

- Local work folder: `D:\__MY APPS\trash compactor`
- GitHub repo: `https://github.com/ungabo/trash-compactor-panic`
- Visibility: public
- Primary stack: Vite, TypeScript, Phaser 3

## Deployment

- Remote host details are read from the local desktop SFTP info file.
- Remote test folder: `/sitesindevelopment/games/Trash Compactor`
- Public test URL is expected to be `https://sitesindevelopment.com/games/Trash%20Compactor/`.
- Latest deployed Prototype 1 build passed headless smoke testing at the public URL.

## Prototype 1 Scope

Implemented target:

- One room
- One character
- WASD/arrow movement
- Pickup/drop with `E`
- Throw with `Space`
- Recyclables, organics, toxic trash
- Matching chutes
- One crate
- One jam plate
- Wall pressure
- Timer
- Score
- Win/fail/restart loop

Out of scope for Prototype 1:

- Campaign progression
- Full four-character cast
- Sewer creature AI
- Pipe rerouting puzzles
- Android touch controls
- Windows packaging
- Online co-op

## Milestone Sequence

1. Prototype 1: core sorting and pressure loop.
2. Prototype 2: character switching, second character ability, pipe rerouting, clog meter.
3. Prototype 3: sewer creature, four characters, three levels, results screen.
4. MVP: 12 levels, settings, save progress, controller/touch pass, web/Windows/Android packaging plan.

## Sub-Agent Log

- Asset/visual analyst: inspected reference material and confirmed current PNG sheets are not transparent; recommended treating them as reference/source until an asset cleanup pass.
- QA/playtest planner: produced Prototype 1 acceptance criteria and browser/headless smoke-test flow.

## Current Next Actions

- Collect playtest notes against Prototype 1.
- Improve asset fidelity with cleaned/generated transparent sprites.
- Start Prototype 2 planning: character switching, pipe rerouting, clog meter.

## Verification Log

- `npm run build`: passed.
- `npm run smoke`: passed locally against `http://127.0.0.1:4173`.
- `npm run setup:remote`: created `/sitesindevelopment/games/Trash Compactor`.
- `npm run deploy`: uploaded `dist/`.
- `SMOKE_URL=https://sitesindevelopment.com/games/Trash%20Compactor/ npm run smoke`: passed against the public deployment.
