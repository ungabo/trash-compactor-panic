/// <reference types="vite/client" />

declare global {
  interface Window {
    __TCP_GAME__?: Phaser.Game;
    __TCP_APP__?: {
      getMode: () => "menu" | "chamber" | "pipes" | "sort";
      selectMode: (mode: "menu" | "chamber" | "pipes" | "sort") => void;
    };
    __TCP_CHAMBER_TEST__?: {
      getState: () => unknown;
      activateHotspot: (id: string) => void;
      reset: () => void;
      forceFail: () => void;
    };
    __TCP_PIPE_TEST__?: {
      getState: () => unknown;
      tapTile: (row: number, col: number) => void;
      solve: () => void;
      reset: () => void;
      scramble: () => void;
      forceFail: () => void;
    };
    __TCP_SORT_TEST__?: {
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
