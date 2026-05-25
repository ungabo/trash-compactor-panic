# Asset Brief

The reference folder contains the current visual source of truth:

- `D:\__MY APPS\trash compactor\reference material\ChatGPT Image May 24, 2026, 06_38_25 PM.png`
- `D:\__MY APPS\trash compactor\reference material\ChatGPT Image May 24, 2026, 06_38_42 PM.png`
- `D:\__MY APPS\trash compactor\reference material\ChatGPT Image May 24, 2026, 07_40_26 PM (1).png`
- `D:\__MY APPS\trash compactor\reference material\ChatGPT Image May 24, 2026, 07_40_26 PM (2).png`
- `D:\__MY APPS\trash compactor\reference material\initial spec doc.txt`

## Current Findings

The four PNGs are RGB images with no alpha channel. The checkerboard backgrounds in the two asset sheets are baked into the pixels, so they are not production-ready transparent sprites.

## Prototype 1 Strategy

The app now uses the original gameplay concept image directly for the Main Chamber playfield:

- `public/assets/concept-gameplay.png`

Pipe Lab uses the provided pipe sheet as a single sprite source:

- `public/assets/pipe-sheet.png`

The public sheet keeps the original frame geometry but removes the baked checkerboard background to alpha so the tiles sit cleanly on the board. The older extracted pipe PNGs are legacy reference artifacts and are not used by the Pipe Lab renderer.

Sorting Sprint still uses clean temporary SVG assets that match the visual language:

- charcoal industrial floor plates
- hazard yellow jam plate
- blue/green/purple category language
- beveled metal HUD panels
- chunky readable object silhouettes

The reference sheets should be revisited in an asset pass to either:

- manually slice and remove backgrounds, or
- regenerate/export transparent sprite sheets for characters, trash, pipe pieces, UI panels, hazards, and effects.

## Visual Tokens

- Base: `#101010`, `#2f302b`, `#5a5548`
- Warning: `#f0b22a`, `#e85a24`
- Critical: `#c82820`
- Recycle: `#1c9be8`
- Organic: `#7fcb2e`
- Toxic: `#a34deb`
