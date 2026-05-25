/// <reference types="vite/client" />

declare global {
  interface Window {
    __TCP_GAME__?: Phaser.Game;
    __TCP_TEST__?: {
      getState: () => unknown;
      spawnTrashAtPlayer: (category?: "recycle" | "organic" | "toxic") => void;
      pickupNearest: () => void;
      dropCarried: () => void;
      sortOneCorrect: () => void;
      sortOneWrong: () => void;
      placeCrateOnJam: () => void;
      forceWin: () => void;
      forcePressureFail: () => void;
      forceTimerFail: () => void;
      restart: () => void;
    };
  }
}

export {};

