# Prototype 1 Acceptance Checklist

Status: first deployed build passed the automated acceptance smoke flow on 2026-05-24.

Prototype 1 is testable when:

- Web build loads from a deployed URL without console errors or missing critical assets.
- One playable room is present and immediately playable.
- One character moves with `WASD` and arrow keys.
- Player can pick up, drop, and throw objects.
- Three visually distinct trash categories exist.
- Three matching destinations/chutes exist.
- Correct sorting increments objective progress and score.
- Wrong sorting gives clear negative feedback and increases pressure.
- Objective is implemented: sort 15 items.
- Wall pressure meter exists, rises over time, and can reach failure.
- One crate and one jam plate exist.
- Placing the crate on the jam plate meaningfully changes pressure behavior.
- Timer exists and can trigger failure.
- Win state triggers after 15 correct sorts.
- Fail state triggers when pressure reaches 100%.
- Fail state triggers when timer expires.
- Basic HUD shows pressure, timer, objective/progress, carried item/status, and score.
- UI is readable at `1920x1080`, `1366x768`, `1440x900`, and `1280x720`.
- Restart works after win/fail without reloading the browser.

## Browser Smoke Flow

1. Open the deployed build.
2. Confirm the canvas and HUD render.
3. Move in all four directions.
4. Pick up an item, drop it, pick it up again, then throw it.
5. Sort one correct item and confirm score/objective feedback.
6. Sort one wrong item and confirm warning/pressure feedback.
7. Let pressure rise.
8. Move crate onto jam plate and confirm pressure behavior changes.
9. Complete 15 correct sorts and verify win state.
10. Restart.
11. Trigger pressure failure.
12. Restart.
13. Trigger timer failure.
14. Check target desktop viewports.

## Headless Smoke Coverage

The `npm run smoke` script checks:

- page errors and failed asset requests
- canvas presence and nonblank pixels
- keyboard movement
- pickup/drop state
- correct sort state
- wrong sort state
- pressure increase
- jam plate activation
- win state
- pressure fail state
- timer fail state
- target viewport rendering
