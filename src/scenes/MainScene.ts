import Phaser from "phaser";
import { PLAY_AREA, PROTOTYPE_LEVEL, TRASH_DEFINITIONS, type TrashCategory } from "../gameData";

type CarryableKind = "trash" | "crate";
type CarryState = "idle" | "carried" | "thrown";
type RunState = "playing" | "won" | "failed";

interface Carryable {
  id: number;
  kind: CarryableKind;
  category?: TrashCategory;
  sprite: Phaser.GameObjects.Image;
  state: CarryState;
  velocity: Phaser.Math.Vector2;
}

interface Chute {
  category: TrashCategory;
  x: number;
  y: number;
  radius: number;
}

interface Keys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  e: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
  r: Phaser.Input.Keyboard.Key;
}

const CATEGORY_ORDER: TrashCategory[] = ["recycle", "organic", "toxic"];
const assetUrl = (fileName: string) => `${import.meta.env.BASE_URL}assets/${fileName}`;

export class MainScene extends Phaser.Scene {
  private keys!: Keys;
  private player!: Phaser.GameObjects.Image;
  private playerGlow!: Phaser.GameObjects.Ellipse;
  private leftWall!: Phaser.GameObjects.Rectangle;
  private rightWall!: Phaser.GameObjects.Rectangle;
  private jamGlow!: Phaser.GameObjects.Ellipse;
  private carryables: Carryable[] = [];
  private chutes: Chute[] = [];
  private carried?: Carryable;
  private crate?: Carryable;
  private pressure = 0;
  private timeLeft = PROTOTYPE_LEVEL.timeLimitSeconds;
  private score = 0;
  private sorted = 0;
  private wrongSorts = 0;
  private nextId = 1;
  private runState: RunState = "playing";
  private lastMove = new Phaser.Math.Vector2(0, -1);
  private feedbackExpiresAt = 0;
  private sortScreen?: HTMLElement | null;
  private readonly handlePickupDropKey = () => this.handlePickupDrop();
  private readonly handleThrowKey = () => this.throwCarried();
  private readonly handleRestartKey = () => {
    if (this.isSortActive()) {
      this.restartLevel();
    }
  };
  private readonly handleRestartClick = () => this.restartLevel();

  constructor() {
    super("MainScene");
  }

  preload(): void {
    this.load.svg("floor-tile", assetUrl("floor-tile.svg"), { width: 64, height: 64 });
    this.load.svg("player-bucket", assetUrl("player-bucket.svg"), { width: 70, height: 78 });
    this.load.svg("crate", assetUrl("crate.svg"), { width: 64, height: 64 });
    this.load.svg("jam-plate", assetUrl("jam-plate.svg"), { width: 78, height: 78 });

    for (const definition of Object.values(TRASH_DEFINITIONS)) {
      this.load.svg(definition.asset, assetUrl(`${definition.asset}.svg`), { width: 52, height: 52 });
      this.load.svg(definition.chuteAsset, assetUrl(`${definition.chuteAsset}.svg`), {
        width: 116,
        height: 82,
      });
    }
  }

  create(): void {
    this.sortScreen = document.getElementById("sort-screen");
    this.applySubGameCopy();
    this.createWorld();
    this.createInput();
    this.createObjects();
    this.createTestHooks();

    this.time.addEvent({
      delay: PROTOTYPE_LEVEL.spawnDelayMs,
      callback: () => this.spawnRandomTrash(),
      loop: true,
    });

    this.input.keyboard?.on("keydown-E", this.handlePickupDropKey);
    this.input.keyboard?.on("keyup-SPACE", this.handleThrowKey);
    this.input.keyboard?.on("keydown-R", this.handleRestartKey);
    document.getElementById("restart-button")?.addEventListener("click", this.handleRestartClick);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.removeInputListeners());

    this.spawnRandomTrash("recycle");
    this.spawnRandomTrash("organic");
    this.spawnRandomTrash("toxic");
    this.updateHud();
  }

  update(_: number, deltaMs: number): void {
    if (!this.isSortActive()) {
      return;
    }

    const dt = deltaMs / 1000;
    if (this.runState !== "playing") {
      return;
    }

    this.updatePlayer(dt);
    this.updateCarryables(dt);
    this.checkSorting();
    this.updatePressureAndTimer(dt);
    this.updateWalls();
    this.updateHud();
  }

  private createWorld(): void {
    this.cameras.main.setBackgroundColor("#10100f");

    const g = this.add.graphics();
    g.fillStyle(0x090a08, 1);
    g.fillRect(0, 0, 1280, 720);
    g.fillStyle(0x171915, 1);
    g.fillRoundedRect(PLAY_AREA.left - 38, PLAY_AREA.top - 42, 866, 616, 20);
    g.lineStyle(8, 0x3d372d, 1);
    g.strokeRoundedRect(PLAY_AREA.left - 38, PLAY_AREA.top - 42, 866, 616, 20);
    g.lineStyle(3, 0x0b0b0a, 1);
    g.strokeRoundedRect(PLAY_AREA.left - 27, PLAY_AREA.top - 31, 844, 594, 14);

    for (let y = PLAY_AREA.top; y < PLAY_AREA.bottom; y += PLAY_AREA.tileSize) {
      for (let x = PLAY_AREA.left; x < PLAY_AREA.right; x += PLAY_AREA.tileSize) {
        const tile = this.add.image(x + 32, y + 32, "floor-tile");
        tile.setAlpha(0.92);
      }
    }

    this.add.rectangle(PLAY_AREA.left + 8, 360, 28, 580, 0x2b241d).setDepth(4);
    this.add.rectangle(PLAY_AREA.right - 8, 360, 28, 580, 0x2b241d).setDepth(4);
    this.leftWall = this.add.rectangle(PLAY_AREA.left - 14, 360, 34, 592, 0x3d3027).setDepth(16);
    this.rightWall = this.add.rectangle(PLAY_AREA.right + 14, 360, 34, 592, 0x3d3027).setDepth(16);

    this.add.text(PLAY_AREA.left + 18, PLAY_AREA.top - 24, "SORTING FLOOR A-13", {
      fontFamily: "Arial Black",
      fontSize: "16px",
      color: "#f0b22a",
    });
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is required for Prototype 1.");
    }

    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    }) as Keys;
  }

  private createObjects(): void {
    this.jamGlow = this.add.ellipse(620, 278, 92, 58, 0xf0b22a, 0.1).setDepth(5);
    this.jamGlow.setStrokeStyle(3, 0xf0b22a, 0.65);
    this.add.image(620, 278, "jam-plate").setDepth(6);

    const crateSprite = this.add.image(405, 340, "crate").setDepth(12);
    this.crate = this.addCarryable("crate", crateSprite);

    this.playerGlow = this.add.ellipse(542, 512, 64, 32, 0x1c9be8, 0.22).setDepth(10);
    this.playerGlow.setStrokeStyle(2, 0x78cbff, 0.75);
    this.player = this.add.image(542, 498, "player-bucket").setDepth(20);

    const chuteX = [420, 640, 860];
    CATEGORY_ORDER.forEach((category, index) => {
      const definition = TRASH_DEFINITIONS[category];
      const x = chuteX[index] ?? 420;
      const y = 646;
      this.add.image(x, y, definition.chuteAsset).setDepth(8);
      this.add
        .text(x, y + 4, definition.label.toUpperCase(), {
          fontFamily: "Arial Black",
          fontSize: "14px",
          color: definition.uiColor,
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(18);
      this.chutes.push({ category, x, y, radius: 58 });
    });
  }

  private addCarryable(kind: CarryableKind, sprite: Phaser.GameObjects.Image, category?: TrashCategory): Carryable {
    const carryable: Carryable = {
      id: this.nextId,
      kind,
      category,
      sprite,
      state: "idle",
      velocity: new Phaser.Math.Vector2(),
    };
    this.nextId += 1;
    this.carryables.push(carryable);
    return carryable;
  }

  private updatePlayer(dt: number): void {
    const move = new Phaser.Math.Vector2(
      Number(this.keys.d.isDown || this.keys.right.isDown) - Number(this.keys.a.isDown || this.keys.left.isDown),
      Number(this.keys.s.isDown || this.keys.down.isDown) - Number(this.keys.w.isDown || this.keys.up.isDown),
    );

    if (move.lengthSq() > 0) {
      move.normalize();
      this.lastMove.copy(move);
      this.player.x += move.x * 235 * dt;
      this.player.y += move.y * 235 * dt;
      this.player.setRotation(move.x * 0.08);
    } else {
      this.player.setRotation(0);
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, PLAY_AREA.left + 42, PLAY_AREA.right - 42);
    this.player.y = Phaser.Math.Clamp(this.player.y, PLAY_AREA.top + 42, PLAY_AREA.bottom - 42);
    this.playerGlow.setPosition(this.player.x, this.player.y + 29);
  }

  private updateCarryables(dt: number): void {
    for (const carryable of this.carryables) {
      if (carryable.state === "carried") {
        carryable.sprite.setPosition(this.player.x + this.lastMove.x * 30, this.player.y - 44 + this.lastMove.y * 8);
        carryable.sprite.setDepth(28);
        continue;
      }

      if (carryable.state === "thrown") {
        carryable.sprite.x += carryable.velocity.x * dt;
        carryable.sprite.y += carryable.velocity.y * dt;
        carryable.velocity.scale(Math.pow(0.055, dt));
        carryable.sprite.setRotation(carryable.sprite.rotation + dt * 4);

        if (carryable.sprite.x < PLAY_AREA.left + 28 || carryable.sprite.x > PLAY_AREA.right - 28) {
          carryable.velocity.x *= -0.45;
        }
        if (carryable.sprite.y < PLAY_AREA.top + 28 || carryable.sprite.y > PLAY_AREA.bottom - 28) {
          carryable.velocity.y *= -0.45;
        }

        carryable.sprite.x = Phaser.Math.Clamp(carryable.sprite.x, PLAY_AREA.left + 26, PLAY_AREA.right - 26);
        carryable.sprite.y = Phaser.Math.Clamp(carryable.sprite.y, PLAY_AREA.top + 26, PLAY_AREA.bottom - 26);

        if (carryable.velocity.length() < 18) {
          carryable.state = "idle";
          carryable.velocity.set(0);
          carryable.sprite.setRotation(0);
          carryable.sprite.setDepth(carryable.kind === "crate" ? 12 : 14);
        }
      }
    }
  }

  private updatePressureAndTimer(dt: number): void {
    const looseTrash = this.carryables.filter((item) => item.kind === "trash" && item.state !== "carried").length;
    const clutterRate = Math.max(0, looseTrash - 4) * PROTOTYPE_LEVEL.clutterPressurePerItem;
    const pressureRate = this.isJamActive()
      ? PROTOTYPE_LEVEL.jamPressurePerSecond
      : PROTOTYPE_LEVEL.basePressurePerSecond + clutterRate;

    this.pressure = Phaser.Math.Clamp(this.pressure + pressureRate * dt, 0, 100);
    this.timeLeft = Math.max(0, this.timeLeft - dt);

    if (this.pressure >= 100) {
      this.endLevel("failed", "Compacted with enthusiasm.", "Wall pressure reached 100%.");
    } else if (this.timeLeft <= 0) {
      this.endLevel("failed", "The trash won.", "The timer expired before the sort quota was met.");
    }
  }

  private updateWalls(): void {
    const inset = Phaser.Math.Linear(0, 58, this.pressure / 100);
    this.leftWall.x = PLAY_AREA.left - 14 + inset;
    this.rightWall.x = PLAY_AREA.right + 14 - inset;
    this.leftWall.fillColor = this.pressure > 75 ? 0x5e241d : 0x3d3027;
    this.rightWall.fillColor = this.pressure > 75 ? 0x5e241d : 0x3d3027;
    this.jamGlow.setAlpha(this.isJamActive() ? 0.42 : 0.1);
  }

  private handlePickupDrop(): void {
    if (!this.isSortActive() || this.runState !== "playing") {
      return;
    }

    if (this.carried) {
      this.dropCarried();
      return;
    }

    this.pickupNearest();
  }

  private pickupNearest(): void {
    if (this.carried) {
      return;
    }

    const nearest = this.carryables
      .filter((item) => item.state === "idle")
      .map((item) => ({
        item,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, item.sprite.x, item.sprite.y),
      }))
      .filter(({ distance }) => distance <= 62)
      .sort((a, b) => a.distance - b.distance)[0]?.item;

    if (!nearest) {
      this.flash("Nothing close enough to grab.");
      return;
    }

    nearest.state = "carried";
    nearest.velocity.set(0);
    this.carried = nearest;
    this.flash(nearest.kind === "crate" ? "Crate grabbed." : `${this.labelFor(nearest.category)} grabbed.`);
  }

  private dropCarried(): void {
    if (!this.carried) {
      return;
    }

    this.carried.state = "idle";
    this.carried.sprite.setDepth(this.carried.kind === "crate" ? 12 : 14);
    this.carried.sprite.setPosition(this.player.x + this.lastMove.x * 48, this.player.y + this.lastMove.y * 42);
    this.carried.sprite.x = Phaser.Math.Clamp(this.carried.sprite.x, PLAY_AREA.left + 28, PLAY_AREA.right - 28);
    this.carried.sprite.y = Phaser.Math.Clamp(this.carried.sprite.y, PLAY_AREA.top + 28, PLAY_AREA.bottom - 28);
    this.flash(this.carried.kind === "crate" ? "Crate dropped." : "Trash dropped.");
    this.carried = undefined;
  }

  private throwCarried(): void {
    if (!this.isSortActive() || this.runState !== "playing" || !this.carried) {
      return;
    }

    const item = this.carried;
    const throwSpeed = item.kind === "crate" ? 380 : 580;
    item.state = "thrown";
    item.velocity.copy(this.lastMove).scale(throwSpeed);
    item.sprite.setDepth(24);
    this.carried = undefined;
    this.flash(item.kind === "crate" ? "Heavy toss!" : "Sorted by air mail.");
  }

  private checkSorting(): void {
    for (const item of [...this.carryables]) {
      if (item.kind !== "trash" || item.state === "carried") {
        continue;
      }

      const chute = this.chutes.find(
        (candidate) => Phaser.Math.Distance.Between(candidate.x, candidate.y, item.sprite.x, item.sprite.y) <= candidate.radius,
      );
      if (!chute) {
        continue;
      }

      if (item.category === chute.category) {
        this.score += TRASH_DEFINITIONS[chute.category].scoreValue;
        this.sorted += 1;
        this.flash(`Correct: ${this.labelFor(chute.category)} sorted.`);
      } else {
        this.score = Math.max(0, this.score - 50);
        this.wrongSorts += 1;
        this.pressure = Phaser.Math.Clamp(this.pressure + PROTOTYPE_LEVEL.wrongSortPressurePenalty, 0, 100);
        this.flash("Wrong pipe! Pressure spike.");
      }

      this.removeCarryable(item);
      if (this.sorted >= PROTOTYPE_LEVEL.targetSorts) {
        this.endLevel("won", "Sprint Complete", "15 items sorted before the walls made their point.");
        return;
      }
    }
  }

  private spawnRandomTrash(forcedCategory?: TrashCategory): void {
    if (!this.isSortActive() || this.runState !== "playing") {
      return;
    }

    const looseTrash = this.carryables.filter((item) => item.kind === "trash").length;
    if (looseTrash >= PROTOTYPE_LEVEL.maxLooseTrash) {
      return;
    }

    const category = forcedCategory ?? Phaser.Utils.Array.GetRandom(CATEGORY_ORDER);
    this.spawnTrash(category, Phaser.Math.Between(330, 925), Phaser.Math.Between(145, 430));
  }

  private spawnTrash(category: TrashCategory, x: number, y: number): Carryable {
    const definition = TRASH_DEFINITIONS[category];
    const sprite = this.add.image(x, y, definition.asset).setDepth(14);
    sprite.setData("category", category);
    return this.addCarryable("trash", sprite, category);
  }

  private removeCarryable(item: Carryable): void {
    if (this.carried?.id === item.id) {
      this.carried = undefined;
    }
    Phaser.Utils.Array.Remove(this.carryables, item);
    item.sprite.destroy();
  }

  private endLevel(state: RunState, title: string, detail: string): void {
    if (this.runState !== "playing") {
      return;
    }

    this.runState = state;
    this.updateHud();
    document.getElementById("state-title")!.textContent = title;
    document.getElementById("state-detail")!.textContent = detail;
    document.getElementById("state-overlay")!.classList.remove("is-hidden");
  }

  private restartLevel(): void {
    document.getElementById("state-overlay")?.classList.add("is-hidden");
    for (const item of [...this.carryables]) {
      this.removeCarryable(item);
    }

    this.carried = undefined;
    this.pressure = 0;
    this.timeLeft = PROTOTYPE_LEVEL.timeLimitSeconds;
    this.score = 0;
    this.sorted = 0;
    this.wrongSorts = 0;
    this.runState = "playing";
    this.feedbackExpiresAt = 0;
    this.nextId = 1;
    this.lastMove.set(0, -1);

    this.player.setPosition(542, 498);
    this.player.setRotation(0);
    this.playerGlow.setPosition(this.player.x, this.player.y + 29);

    const crateSprite = this.add.image(405, 340, "crate").setDepth(12);
    this.crate = this.addCarryable("crate", crateSprite);
    this.spawnRandomTrash("recycle");
    this.spawnRandomTrash("organic");
    this.spawnRandomTrash("toxic");
    this.updateWalls();
    this.flash("Shift restarted.");
    this.updateHud();
  }

  private isJamActive(): boolean {
    if (!this.crate || this.crate.state === "carried") {
      return false;
    }

    return Phaser.Math.Distance.Between(this.crate.sprite.x, this.crate.sprite.y, 620, 278) < 54;
  }

  private updateHud(): void {
    const pressureFill = document.getElementById("pressure-fill");
    const pressureText = document.getElementById("pressure-text");
    const objectiveText = document.getElementById("objective-text");
    const scoreText = document.getElementById("score-text");
    const jamState = document.getElementById("jam-state");
    const timeText = document.getElementById("time-text");
    const carriedText = document.getElementById("carried-text");
    const statusText = document.getElementById("status-text");
    const feedbackLog = document.getElementById("feedback-log");

    if (pressureFill) pressureFill.style.width = `${this.pressure}%`;
    if (pressureText) pressureText.textContent = `${Math.round(this.pressure)}%`;
    if (objectiveText) objectiveText.textContent = `Sort ${this.sorted} / ${PROTOTYPE_LEVEL.targetSorts}`;
    if (scoreText) scoreText.textContent = `Score ${this.score}`;
    if (jamState) jamState.textContent = this.isJamActive() ? "Jam plate active: pressure easing" : "Jam plate inactive";
    if (timeText) timeText.textContent = this.formatTime(this.timeLeft);
    if (carriedText) {
      carriedText.textContent = this.carried
        ? this.carried.kind === "crate"
          ? "Carrying crate"
          : `Carrying ${this.labelFor(this.carried.category)}`
        : "Hands free";
    }
    if (statusText) {
      statusText.textContent =
        this.runState === "playing"
          ? "Sort 15 items. Move the crate onto the numbered jam plate to slow pressure."
          : this.runState === "won"
            ? "Shift complete. Somehow."
            : "Failure report filed.";
    }
    if (feedbackLog && this.time.now > this.feedbackExpiresAt) {
      feedbackLog.textContent = "";
    }
  }

  private flash(message: string): void {
    const feedbackLog = document.getElementById("feedback-log");
    if (feedbackLog) {
      feedbackLog.textContent = message;
    }
    this.feedbackExpiresAt = this.time.now + 1450;
  }

  private labelFor(category?: TrashCategory): string {
    return category ? TRASH_DEFINITIONS[category].label : "item";
  }

  private formatTime(seconds: number): string {
    const whole = Math.ceil(seconds);
    const minutes = Math.floor(whole / 60);
    const remaining = whole % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }

  private isSortActive(): boolean {
    this.sortScreen ??= document.getElementById("sort-screen");
    return !this.sortScreen || !this.sortScreen.classList.contains("is-hidden");
  }

  private applySubGameCopy(): void {
    const brandTitle = this.sortScreen?.querySelector<HTMLElement>(".brand-title");
    const brandTagline = this.sortScreen?.querySelector<HTMLElement>(".brand-panel p");

    brandTitle?.replaceChildren("Sorting", document.createElement("br"), "Sprint");
    if (brandTagline) {
      brandTagline.textContent = "Trash Compactor Panic sub-game";
    }
  }

  private removeInputListeners(): void {
    this.input.keyboard?.off("keydown-E", this.handlePickupDropKey);
    this.input.keyboard?.off("keyup-SPACE", this.handleThrowKey);
    this.input.keyboard?.off("keydown-R", this.handleRestartKey);
    document.getElementById("restart-button")?.removeEventListener("click", this.handleRestartClick);
  }

  private createTestHooks(): void {
    window.__TCP_SORT_TEST__ = {
      getState: () => ({
        runState: this.runState,
        pressure: this.pressure,
        timeLeft: this.timeLeft,
        score: this.score,
        sorted: this.sorted,
        wrongSorts: this.wrongSorts,
        jamActive: this.isJamActive(),
        player: { x: this.player?.x ?? 0, y: this.player?.y ?? 0 },
        carried: this.carried
          ? {
              kind: this.carried.kind,
              category: this.carried.category,
            }
          : null,
        looseTrash: this.carryables.filter((item) => item.kind === "trash" && item.state !== "carried").length,
      }),
      spawnTrashAtPlayer: (category = "recycle") => {
        this.spawnTrash(category, this.player.x + 42, this.player.y);
      },
      pickupNearest: () => this.pickupNearest(),
      dropCarried: () => this.dropCarried(),
      sortOneCorrect: () => {
        const category = Phaser.Utils.Array.GetRandom(CATEGORY_ORDER);
        const chute = this.chutes.find((candidate) => candidate.category === category)!;
        this.spawnTrash(category, chute.x, chute.y);
        this.checkSorting();
        this.updateHud();
      },
      sortOneWrong: () => {
        const chute = this.chutes.find((candidate) => candidate.category === "recycle")!;
        this.spawnTrash("toxic", chute.x, chute.y);
        this.checkSorting();
        this.updateHud();
      },
      placeCrateOnJam: () => {
        if (!this.crate) return;
        if (this.carried?.id === this.crate.id) this.carried = undefined;
        this.crate.state = "idle";
        this.crate.sprite.setPosition(620, 278);
        this.updateHud();
      },
      forceWin: () => {
        this.sorted = PROTOTYPE_LEVEL.targetSorts;
        this.endLevel("won", "Level Complete", "Debug win condition verified.");
      },
      forcePressureFail: () => {
        this.pressure = 100;
        this.endLevel("failed", "Compacted with enthusiasm.", "Debug pressure failure verified.");
      },
      forceTimerFail: () => {
        this.timeLeft = 0;
        this.endLevel("failed", "The trash won.", "Debug timer failure verified.");
      },
      restart: () => this.restartLevel(),
    };
  }
}
