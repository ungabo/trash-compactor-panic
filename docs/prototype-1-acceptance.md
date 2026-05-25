# Prototype Acceptance Checklist

Status: the current local build passed the automated smoke flow on 2026-05-24.

The app is testable when:

- Web build loads from a deployed URL without console errors or missing critical assets.
- Root menu appears first and offers three selectable games.
- Main Chamber uses the original concept gameplay image as the playfield.
- Main Chamber hotspots work by click/touch: crate pickup, jam plate, pipe repair, Emergency Jam.
- Pipe Lab uses the provided cropped pipe assets.
- Pipe Lab supports click/tap rotation and can validate a completed route.
- Sorting Sprint remains available as a sub-game.
- Sorting Sprint keeps keyboard movement, pickup/drop, sorting, pressure, and jam plate behavior.
- Mobile/touch smoke test can open the menu, play Main Chamber, and tap Pipe Lab tiles.
- Desktop viewport smoke checks pass at `1920x1080`, `1366x768`, `1440x900`, and `1280x720`.

## Headless Smoke Coverage

The `npm run smoke` script checks:

- page errors and failed asset requests
- root menu visibility
- Main Chamber image loading and hotspot interactions
- Main Chamber forced failure/reset
- Pipe Lab tile size, click/tap rotation, route solve, failure/reset
- Sorting Sprint canvas rendering and core keyboard interactions
- mobile touch flow for Main Chamber and Pipe Lab
- desktop viewport rendering

