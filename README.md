# Trash Compactor Panic

Fast, funny, web-first mini-game collection about repairing pipes, jamming a closing compactor, sorting junk, and surviving a spectacularly unsafe sci-fi workplace.

## Current Phase

The app now opens to a root menu with three themed mini-games:

- **Main Chamber**: concept-art chamber game using the original gameplay mockup as the playfield. Tap hotspots to repair pipes, grab crates, jam plates, and fire Emergency Jam.
- **Pipe Lab**: tap-to-rotate pipe route puzzle using cropped pipe assets from the provided pipe sheet.
- **Sorting Sprint**: arcade sorting sub-game from the first prototype.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run smoke
npm run deploy
```

Deployments upload `dist/` to:

```text
/sitesindevelopment/games/Trash Compactor
```

Current public test URL:

```text
https://sitesindevelopment.com/games/Trash%20Compactor/
```

Credentials are read from the local desktop SFTP info file and are not committed.

## Project Management

The project tracker lives in [docs/project-status.md](docs/project-status.md). Prototype acceptance criteria live in [docs/prototype-1-acceptance.md](docs/prototype-1-acceptance.md).
