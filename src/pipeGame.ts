type Direction = 0 | 1 | 2 | 3;
type PipeType = "source" | "sink" | "straight" | "elbow" | "tee" | "cross" | "blocked";
type PipeRunState = "playing" | "won" | "failed";
type PipeAssetShape = "valve" | "straight" | "elbow" | "tee" | "cross";

interface PipeSheetFrame {
  x: number;
  y: number;
}

interface PipeCell {
  row: number;
  col: number;
  type: PipeType;
  rotation: number;
  initialRotation: number;
  solutionRotation: number;
  locked?: boolean;
}

const enum DirMask {
  North = 1,
  East = 2,
  South = 4,
  West = 8,
}

const DIRS: Array<{ dir: Direction; dr: number; dc: number; mask: DirMask; opposite: DirMask }> = [
  { dir: 0, dr: -1, dc: 0, mask: DirMask.North, opposite: DirMask.South },
  { dir: 1, dr: 0, dc: 1, mask: DirMask.East, opposite: DirMask.West },
  { dir: 2, dr: 1, dc: 0, mask: DirMask.South, opposite: DirMask.North },
  { dir: 3, dr: 0, dc: -1, mask: DirMask.West, opposite: DirMask.East },
];

const PIPE_SHEET = {
  fileName: "pipe-sheet.png",
  width: 1086,
  height: 1448,
  frameSize: 195,
};

const PIPE_SHEET_FRAMES: Record<PipeAssetShape, PipeSheetFrame> = {
  straight: { x: 18, y: 184 },
  elbow: { x: 238, y: 184 },
  tee: { x: 456, y: 184 },
  cross: { x: 675, y: 184 },
  valve: { x: 891, y: 184 },
};

const VISUAL_ROTATION_OFFSET: Record<PipeAssetShape, number> = {
  valve: 0,
  straight: 1,
  elbow: 3,
  tee: 1,
  cross: 0,
};

const pipeSheetUrl = () => `${import.meta.env.BASE_URL}assets/${PIPE_SHEET.fileName}`;

const LEVEL_TEMPLATE: Array<Array<Omit<PipeCell, "row" | "col" | "initialRotation">>> = [
  [
    { type: "elbow", rotation: 1, solutionRotation: 0 },
    { type: "straight", rotation: 0, solutionRotation: 1 },
    { type: "tee", rotation: 2, solutionRotation: 3 },
    { type: "blocked", rotation: 0, solutionRotation: 0, locked: true },
    { type: "elbow", rotation: 3, solutionRotation: 2 },
    { type: "straight", rotation: 1, solutionRotation: 0 },
  ],
  [
    { type: "tee", rotation: 1, solutionRotation: 0 },
    { type: "elbow", rotation: 2, solutionRotation: 1 },
    { type: "straight", rotation: 0, solutionRotation: 1 },
    { type: "elbow", rotation: 0, solutionRotation: 3 },
    { type: "tee", rotation: 0, solutionRotation: 2 },
    { type: "elbow", rotation: 1, solutionRotation: 3 },
  ],
  [
    { type: "source", rotation: 0, solutionRotation: 0, locked: true },
    { type: "straight", rotation: 0, solutionRotation: 1 },
    { type: "elbow", rotation: 3, solutionRotation: 2 },
    { type: "straight", rotation: 1, solutionRotation: 0 },
    { type: "tee", rotation: 2, solutionRotation: 1 },
    { type: "elbow", rotation: 2, solutionRotation: 0 },
  ],
  [
    { type: "straight", rotation: 0, solutionRotation: 1 },
    { type: "tee", rotation: 3, solutionRotation: 0 },
    { type: "elbow", rotation: 2, solutionRotation: 0 },
    { type: "elbow", rotation: 3, solutionRotation: 2 },
    { type: "straight", rotation: 0, solutionRotation: 1 },
    { type: "tee", rotation: 1, solutionRotation: 2 },
  ],
  [
    { type: "elbow", rotation: 0, solutionRotation: 1 },
    { type: "straight", rotation: 1, solutionRotation: 0 },
    { type: "tee", rotation: 0, solutionRotation: 3 },
    { type: "elbow", rotation: 1, solutionRotation: 0 },
    { type: "straight", rotation: 0, solutionRotation: 1 },
    { type: "sink", rotation: 0, solutionRotation: 0, locked: true },
  ],
  [
    { type: "blocked", rotation: 0, solutionRotation: 0, locked: true },
    { type: "elbow", rotation: 1, solutionRotation: 2 },
    { type: "straight", rotation: 0, solutionRotation: 1 },
    { type: "tee", rotation: 2, solutionRotation: 0 },
    { type: "elbow", rotation: 0, solutionRotation: 3 },
    { type: "straight", rotation: 1, solutionRotation: 0 },
  ],
];

export class PipeGame {
  private readonly boardElement = this.requiredElement("pipe-board");
  private readonly pressureFill = this.requiredElement("pipe-pressure-fill");
  private readonly pressureText = this.requiredElement("pipe-pressure-text");
  private readonly timeText = this.requiredElement("pipe-time-text");
  private readonly movesText = this.requiredElement("pipe-moves-text");
  private readonly leaksText = this.requiredElement("pipe-leaks-text");
  private readonly progressText = this.requiredElement("pipe-progress-text");
  private readonly feedback = this.requiredElement("pipe-feedback");
  private readonly objective = this.requiredElement("pipe-objective-text");
  private readonly overlay = this.requiredElement("pipe-overlay");
  private readonly stateTitle = this.requiredElement("pipe-state-title");
  private readonly stateDetail = this.requiredElement("pipe-state-detail");

  private cells: PipeCell[][] = [];
  private powered = new Set<string>();
  private leakEdges = new Set<string>();
  private runState: PipeRunState = "playing";
  private active = true;
  private moves = 0;
  private leaks = 0;
  private pressure = 8;
  private timeLeft = 90;
  private hinted = false;
  private lastTick = performance.now();
  private rafId = 0;

  constructor() {
    this.preloadAssets();
    this.reset(true);
    this.bindControls();
    this.exposeTestHooks();
    this.tick = this.tick.bind(this);
    this.rafId = requestAnimationFrame(this.tick);
  }

  setActive(active: boolean): void {
    this.active = active;
    this.lastTick = performance.now();
  }

  reset(useInitialRotations = true): void {
    this.cells = LEVEL_TEMPLATE.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        ...cell,
        row: rowIndex,
        col: colIndex,
        rotation: useInitialRotations ? cell.rotation : this.scrambledRotation(cell),
        initialRotation: cell.rotation,
      })),
    );
    this.runState = "playing";
    this.moves = 0;
    this.leaks = 0;
    this.pressure = 8;
    this.timeLeft = 90;
    this.hinted = false;
    this.overlay.classList.add("is-hidden");
    this.objective.textContent = "Goal: tap pipe tiles to rotate blue flow from INLET to OUTLET.";
    this.feedback.textContent = "Tap any unlocked pipe tile to rotate it.";
    this.evaluateFlow();
    this.render();
    this.updateHud();
  }

  scramble(): void {
    this.reset(false);
    this.feedback.textContent = "Grid scrambled. Corporate denies responsibility.";
  }

  rotateCell(row: number, col: number): void {
    if (this.runState !== "playing") return;

    const cell = this.cells[row]?.[col];
    if (!cell || cell.locked || cell.type === "blocked") return;

    cell.rotation = (cell.rotation + 1) % 4;
    this.moves += 1;
    this.evaluateFlow();
    this.pressure = Math.min(100, this.pressure + this.leaks * 0.35);
    this.render();
    this.updateHud();
    this.feedback.textContent = this.leaks > 0 ? "Flow preview shows an open leak." : "Route looks cleaner.";

    if (this.isSolved()) {
      this.finish("won", "Pipeline Secured", "Blue flow reached the outlet before the room folded in.");
    }
  }

  solve(): void {
    for (const row of this.cells) {
      for (const cell of row) {
        cell.rotation = cell.solutionRotation;
      }
    }
    this.evaluateFlow();
    this.render();
    this.updateHud();
    this.finish("won", "Pipeline Secured", "Flow restored before corporate noticed.");
  }

  forceFail(): void {
    this.pressure = 100;
    this.finish("failed", "Pipe Burst", "Pressure reached 100% before the route was sealed.");
  }

  getState() {
    return {
      runState: this.runState,
      moves: this.moves,
      leaks: this.leaks,
      pressure: this.pressure,
      timeLeft: this.timeLeft,
      solved: this.isSolved(),
      poweredCount: this.powered.size,
      rotations: this.cells.map((row) => row.map((cell) => cell.rotation)),
    };
  }

  private tick(now: number): void {
    const dt = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;

    if (this.active && this.runState === "playing") {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      this.pressure = Math.min(100, this.pressure + dt * (0.32 + this.leaks * 0.12));

      if (this.timeLeft <= 0) {
        this.finish("failed", "Shift Expired", "The timer ran out with the pipeline still misaligned.");
      } else if (this.pressure >= 100) {
        this.finish("failed", "Pipe Burst", "Pressure reached 100% before the route was sealed.");
      } else {
        this.updateHud();
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  }

  private bindControls(): void {
    this.boardElement.addEventListener("pointerup", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>(".pipe-tile");
      if (!target) return;
      event.preventDefault();
      this.rotateCell(Number(target.dataset.row), Number(target.dataset.col));
    });

    document.getElementById("pipe-reset-button")?.addEventListener("click", () => this.reset(true));
    document.getElementById("pipe-new-button")?.addEventListener("click", () => this.scramble());
    document.getElementById("pipe-restart-button")?.addEventListener("click", () => this.scramble());
    document.getElementById("pipe-hint-button")?.addEventListener("click", () => this.pingRoute());
  }

  private render(): void {
    this.boardElement.replaceChildren();
    for (const row of this.cells) {
      for (const cell of row) {
        const tile = document.createElement("button");
        const key = this.keyFor(cell.row, cell.col);
        tile.type = "button";
        tile.className = [
          "pipe-tile",
          `pipe-tile-${cell.type}`,
          this.powered.has(key) ? "is-powered" : "",
          this.hasLeak(cell) ? "has-leak" : "",
          cell.locked ? "is-locked" : "",
          this.hinted && cell.solutionRotation !== cell.rotation && !cell.locked ? "needs-rotation" : "",
        ]
          .filter(Boolean)
          .join(" ");
        tile.dataset.row = String(cell.row);
        tile.dataset.col = String(cell.col);
        tile.dataset.type = cell.type;
        tile.dataset.rotation = String(cell.rotation);
        tile.disabled = Boolean(cell.locked || cell.type === "blocked" || this.runState !== "playing");
        tile.ariaLabel = this.labelFor(cell);
        tile.innerHTML = this.artFor(cell) + this.leakArtFor(cell);
        this.boardElement.append(tile);
      }
    }
  }

  private evaluateFlow(): void {
    const source = this.findCell("source");
    const sink = this.findCell("sink");
    const queue = [source];
    const visited = new Set<string>([this.keyFor(source.row, source.col)]);
    const leaks = new Set<string>();
    let leakCount = 0;

    while (queue.length > 0) {
      const cell = queue.shift();
      if (!cell) continue;

      const openings = this.maskFor(cell);
      for (const direction of DIRS) {
        if ((openings & direction.mask) === 0) continue;

        const neighbor = this.cells[cell.row + direction.dr]?.[cell.col + direction.dc];
        if (!neighbor) {
          leaks.add(this.leakKeyFor(cell.row, cell.col, direction.dir));
          leakCount += 1;
          continue;
        }

        const neighborMask = this.maskFor(neighbor);
        if ((neighborMask & direction.opposite) === 0) {
          leaks.add(this.leakKeyFor(cell.row, cell.col, direction.dir));
          leakCount += 1;
          continue;
        }

        const key = this.keyFor(neighbor.row, neighbor.col);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    this.powered = visited;
    this.leaks = this.powered.has(this.keyFor(sink.row, sink.col)) ? 0 : leakCount;
    this.leakEdges = this.leaks === 0 ? new Set<string>() : leaks;
  }

  private isSolved(): boolean {
    const sink = this.findCell("sink");
    return this.powered.has(this.keyFor(sink.row, sink.col));
  }

  private finish(state: PipeRunState, title: string, detail: string): void {
    if (this.runState !== "playing") return;
    this.runState = state;
    this.stateTitle.textContent = title;
    this.stateDetail.textContent = detail;
    this.overlay.classList.remove("is-hidden");
    this.render();
    this.updateHud();
  }

  private updateHud(): void {
    this.pressureFill.style.width = `${Math.round(this.pressure)}%`;
    this.pressureText.textContent = `${Math.round(this.pressure)}%`;
    this.timeText.textContent = this.formatTime(this.timeLeft);
    this.progressText.textContent = this.isSolved()
      ? "Outlet connected. Pipeline secured."
      : `Blue flow reached ${this.powered.size} tile${this.powered.size === 1 ? "" : "s"}.`;
    this.movesText.textContent = `Moves ${this.moves}`;
    this.leaksText.textContent = `Leaks ${this.leaks}`;
  }

  private pingRoute(): void {
    this.hinted = !this.hinted;
    this.feedback.textContent = this.hinted ? "Misaligned route pieces are tagged in amber." : "Route hints cleared.";
    this.render();
  }

  private maskFor(cell: PipeCell): number {
    const base = this.baseMaskFor(cell.type);
    if (cell.type === "source" || cell.type === "sink" || cell.type === "cross" || cell.type === "blocked") {
      return base;
    }

    let rotated = base;
    for (let i = 0; i < cell.rotation; i += 1) {
      rotated = this.rotateMask(rotated);
    }
    return rotated;
  }

  private baseMaskFor(type: PipeType): number {
    switch (type) {
      case "source":
        return DirMask.East;
      case "sink":
        return DirMask.West;
      case "straight":
        return DirMask.North | DirMask.South;
      case "elbow":
        return DirMask.North | DirMask.East;
      case "tee":
        return DirMask.North | DirMask.East | DirMask.South;
      case "cross":
        return DirMask.North | DirMask.East | DirMask.South | DirMask.West;
      case "blocked":
        return 0;
    }
  }

  private rotateMask(mask: number): number {
    let next = 0;
    if (mask & DirMask.North) next |= DirMask.East;
    if (mask & DirMask.East) next |= DirMask.South;
    if (mask & DirMask.South) next |= DirMask.West;
    if (mask & DirMask.West) next |= DirMask.North;
    return next;
  }

  private artFor(cell: PipeCell): string {
    if (cell.type === "blocked") {
      return `<span class="pipe-blocker" aria-hidden="true"><span></span><span></span><span></span></span>`;
    }

    const shape = this.assetShapeFor(cell);
    const rotation = this.assetRotationFor(cell, shape);
    const terminalMarker =
      cell.type === "source" || cell.type === "sink"
        ? `<span class="pipe-terminal-marker pipe-terminal-${cell.type}" aria-hidden="true"></span>`
        : "";

    return `<span class="pipe-sheet-piece" style="${this.sheetStyleFor(shape, rotation)}" aria-hidden="true"><img class="pipe-sheet-image" src="${pipeSheetUrl()}" style="${this.sheetImageStyleFor(shape)}" alt="" draggable="false" /></span>${terminalMarker}`;
  }

  private sheetStyleFor(shape: PipeAssetShape, rotation: number): string {
    return [
      `--pipe-rotation: ${rotation}deg`,
      shape === "valve" ? "--pipe-scale: 1.015" : "--pipe-scale: 1",
    ].join("; ");
  }

  private sheetImageStyleFor(shape: PipeAssetShape): string {
    const frame = PIPE_SHEET_FRAMES[shape];
    const sheetWidth = (PIPE_SHEET.width / PIPE_SHEET.frameSize) * 100;
    const sheetHeight = (PIPE_SHEET.height / PIPE_SHEET.frameSize) * 100;
    const left = -(frame.x / PIPE_SHEET.frameSize) * 100;
    const top = -(frame.y / PIPE_SHEET.frameSize) * 100;

    return [`width: ${sheetWidth}%`, `height: ${sheetHeight}%`, `left: ${left}%`, `top: ${top}%`].join("; ");
  }

  private leakArtFor(cell: PipeCell): string {
    return DIRS.filter((direction) => this.leakEdges.has(this.leakKeyFor(cell.row, cell.col, direction.dir)))
      .map((direction) => `<span class="pipe-leak-marker leak-${direction.dir}" aria-hidden="true"></span>`)
      .join("");
  }

  private assetShapeFor(cell: PipeCell): PipeAssetShape {
    if (cell.type === "source" || cell.type === "sink") return "valve";
    if (cell.type === "straight" || cell.type === "elbow" || cell.type === "tee" || cell.type === "cross") {
      return cell.type;
    }
    throw new Error("Blocked cells do not use pipe assets");
  }

  private assetRotationFor(cell: PipeCell, shape: PipeAssetShape): number {
    if (cell.type === "source") return 0;
    if (cell.type === "sink") return 180;
    if (shape === "cross" || shape === "valve") return 0;
    return ((cell.rotation + VISUAL_ROTATION_OFFSET[shape]) % 4) * 90;
  }

  private labelFor(cell: PipeCell): string {
    if (cell.type === "source") return "Blue inlet source";
    if (cell.type === "sink") return "Blue outlet target";
    if (cell.type === "blocked") return "Blocked plate";
    return `Tap to rotate ${cell.type} pipe at row ${cell.row + 1}, column ${cell.col + 1}. Rotation ${cell.rotation}`;
  }

  private scrambledRotation(cell: Omit<PipeCell, "row" | "col" | "initialRotation">): number {
    if (cell.locked || cell.type === "blocked" || cell.type === "cross") return cell.rotation;
    return (cell.solutionRotation + 1 + Math.floor(Math.random() * 3)) % 4;
  }

  private findCell(type: "source" | "sink"): PipeCell {
    const cell = this.cells.flat().find((candidate) => candidate.type === type);
    if (!cell) throw new Error(`Missing ${type} cell`);
    return cell;
  }

  private keyFor(row: number, col: number): string {
    return `${row}:${col}`;
  }

  private leakKeyFor(row: number, col: number, direction: Direction): string {
    return `${row}:${col}:${direction}`;
  }

  private hasLeak(cell: PipeCell): boolean {
    return DIRS.some((direction) => this.leakEdges.has(this.leakKeyFor(cell.row, cell.col, direction.dir)));
  }

  private formatTime(seconds: number): string {
    const whole = Math.ceil(seconds);
    return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  }

  private requiredElement<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing #${id}`);
    return element as T;
  }

  private preloadAssets(): void {
    const image = new Image();
    image.src = pipeSheetUrl();
  }

  private exposeTestHooks(): void {
    window.__TCP_PIPE_TEST__ = {
      getState: () => this.getState(),
      tapTile: (row: number, col: number) => this.rotateCell(row, col),
      solve: () => this.solve(),
      reset: () => this.reset(true),
      scramble: () => this.scramble(),
      forceFail: () => this.forceFail(),
    };
  }
}
