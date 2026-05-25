# Trash Compactor Panic

Fast, funny, web-first puzzle-action prototype about sorting junk, jamming a closing compactor, and surviving a spectacularly unsafe sci-fi workplace.

## Current Phase

Prototype 1 is the active milestone:

- one room
- one playable character
- three trash categories and three matching chutes
- pickup, drop, and throw
- one crate and one jam plate
- pressure meter, timer, score, objective progress
- browser and headless smoke-test verification

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

The project tracker lives in [docs/project-status.md](docs/project-status.md). Prototype 1 acceptance criteria live in [docs/prototype-1-acceptance.md](docs/prototype-1-acceptance.md).
