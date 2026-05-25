import Phaser from "phaser";
import { ConceptChamberGame } from "./conceptChamberGame";
import { PipeGame } from "./pipeGame";
import { MainScene } from "./scenes/MainScene";
import "./styles.css";

type AppMode = "menu" | "chamber" | "pipes" | "sort";

const chamberGame = new ConceptChamberGame();
const pipeGame = new PipeGame();
let sortGame: Phaser.Game | undefined;
let currentMode: AppMode = "menu";

function ensureSortGame(): Phaser.Game {
  if (sortGame) {
    sortGame.scale.refresh();
    return sortGame;
  }

  sortGame = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: "game-root",
    width: 1280,
    height: 720,
    backgroundColor: "#10100f",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MainScene],
    render: {
      antialias: true,
      pixelArt: false,
    },
  });
  window.__TCP_GAME__ = sortGame;
  return sortGame;
}

function selectMode(mode: AppMode): void {
  currentMode = mode;
  const menuScreen = document.getElementById("menu-screen");
  const modeBar = document.getElementById("mode-bar");
  const conceptScreen = document.getElementById("concept-screen");
  const pipeScreen = document.getElementById("pipe-screen");
  const sortScreen = document.getElementById("sort-screen");
  const menuButton = document.getElementById("menu-mode-button");
  const chamberButton = document.getElementById("chamber-mode-button");
  const pipeButton = document.getElementById("pipe-mode-button");
  const sortButton = document.getElementById("sort-mode-button");

  menuScreen?.classList.toggle("is-hidden", mode !== "menu");
  modeBar?.classList.toggle("is-hidden", mode === "menu");
  conceptScreen?.classList.toggle("is-hidden", mode !== "chamber");
  pipeScreen?.classList.toggle("is-hidden", mode !== "pipes");
  sortScreen?.classList.toggle("is-hidden", mode !== "sort");
  menuButton?.classList.toggle("is-active", mode === "menu");
  chamberButton?.classList.toggle("is-active", mode === "chamber");
  pipeButton?.classList.toggle("is-active", mode === "pipes");
  sortButton?.classList.toggle("is-active", mode === "sort");
  chamberGame.setActive(mode === "chamber");
  pipeGame.setActive(mode === "pipes");

  if (mode === "sort") {
    ensureSortGame();
    requestAnimationFrame(() => sortGame?.scale.refresh());
  }
}

const blockedKeys = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
window.addEventListener(
  "keydown",
  (event) => {
    if (blockedKeys.has(event.code)) {
      event.preventDefault();
    }
  },
  { passive: false },
);

document.getElementById("chamber-mode-button")?.addEventListener("click", () => selectMode("chamber"));
document.getElementById("pipe-mode-button")?.addEventListener("click", () => selectMode("pipes"));
document.getElementById("sort-mode-button")?.addEventListener("click", () => selectMode("sort"));
document.getElementById("menu-mode-button")?.addEventListener("click", () => selectMode("menu"));
document.getElementById("menu-chamber-button")?.addEventListener("click", () => selectMode("chamber"));
document.getElementById("menu-pipe-button")?.addEventListener("click", () => selectMode("pipes"));
document.getElementById("menu-sort-button")?.addEventListener("click", () => selectMode("sort"));
document.getElementById("pipe-main-button")?.addEventListener("click", () => selectMode("chamber"));

window.__TCP_APP__ = {
  getMode: () => currentMode,
  selectMode,
};

selectMode("menu");
