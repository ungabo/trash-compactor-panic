import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";
import "./styles.css";

const game = new Phaser.Game({
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

window.__TCP_GAME__ = game;

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
