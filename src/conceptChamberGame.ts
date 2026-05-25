type ChamberRunState = "playing" | "won" | "failed";
type ChamberHotspotKind = "crate" | "jam" | "pipe" | "emergency";

interface ChamberHotspot {
  id: string;
  kind: ChamberHotspotKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const CHAMBER_HOTSPOTS: ChamberHotspot[] = [
  { id: "crate-left", kind: "crate", label: "Loose crate", x: 31.8, y: 35.4, width: 4.8, height: 7.4 },
  { id: "crate-mid", kind: "crate", label: "Loose crate", x: 51.5, y: 34.6, width: 4.8, height: 7.4 },
  { id: "crate-right", kind: "crate", label: "Loose crate", x: 59.7, y: 42.8, width: 4.6, height: 7.2 },
  { id: "jam-1", kind: "jam", label: "Jam plate 1", x: 42.7, y: 23.1, width: 5.4, height: 7.2 },
  { id: "jam-2", kind: "jam", label: "Jam plate 2", x: 49.1, y: 39.4, width: 5.8, height: 7.5 },
  { id: "jam-3", kind: "jam", label: "Jam plate 3", x: 63.0, y: 39.1, width: 5.7, height: 7.4 },
  { id: "blue-route", kind: "pipe", label: "Blue recycle pipe break", x: 36.0, y: 55.0, width: 7.0, height: 9.0 },
  { id: "green-route", kind: "pipe", label: "Green organics valve", x: 55.0, y: 63.0, width: 8.0, height: 8.0 },
  { id: "purple-route", kind: "pipe", label: "Purple toxic reroute", x: 72.0, y: 45.0, width: 7.4, height: 10.0 },
  { id: "emergency-jam", kind: "emergency", label: "Emergency jam button", x: 62.2, y: 88.6, width: 10.2, height: 8.2 },
];
const INITIAL_REPAIRED_PIPE_IDS = ["blue-route", "green-route"];

export class ConceptChamberGame {
  private readonly layer = this.requiredElement("concept-hotspot-layer");
  private readonly pressureText = this.requiredElement("concept-pressure");
  private readonly timeText = this.requiredElement("concept-time");
  private readonly crateText = this.requiredElement("concept-crates");
  private readonly jamText = this.requiredElement("concept-jammed");
  private readonly pipeText = this.requiredElement("concept-pipes");
  private readonly statusText = this.requiredElement("concept-status");
  private readonly nextActionText = this.requiredElement("concept-next-action");
  private readonly overlay = this.requiredElement("concept-overlay");
  private readonly stateTitle = this.requiredElement("concept-state-title");
  private readonly stateDetail = this.requiredElement("concept-state-detail");

  private runState: ChamberRunState = "playing";
  private active = true;
  private pressure = 58;
  private timeLeft = 84;
  private cratesHeld = 0;
  private jammed = 0;
  private routed = 2;
  private emergencyUsed = false;
  private repairedPipes = new Set<string>(INITIAL_REPAIRED_PIPE_IDS);
  private jammedPlates = new Set<string>();
  private collectedCrates = new Set<string>();
  private lastTick = performance.now();
  private rafId = 0;

  constructor() {
    this.renderHotspots();
    this.bindControls();
    this.exposeTestHooks();
    this.tick = this.tick.bind(this);
    this.rafId = requestAnimationFrame(this.tick);
    this.updateHud();
  }

  setActive(active: boolean): void {
    this.active = active;
    this.lastTick = performance.now();
  }

  reset(): void {
    this.runState = "playing";
    this.pressure = 58;
    this.timeLeft = 84;
    this.cratesHeld = 0;
    this.jammed = 0;
    this.routed = 2;
    this.emergencyUsed = false;
    this.repairedPipes.clear();
    for (const pipeId of INITIAL_REPAIRED_PIPE_IDS) {
      this.repairedPipes.add(pipeId);
    }
    this.jammedPlates.clear();
    this.collectedCrates.clear();
    this.overlay.classList.add("is-hidden");
    this.statusText.textContent = "Start with a crate or tap the red pipe repair ring.";
    this.renderHotspots();
    this.updateHud();
  }

  activateHotspot(id: string): void {
    if (this.runState !== "playing") return;

    const hotspot = CHAMBER_HOTSPOTS.find((candidate) => candidate.id === id);
    if (!hotspot) return;

    switch (hotspot.kind) {
      case "crate":
        this.collectCrate(hotspot);
        break;
      case "jam":
        this.jamPlate(hotspot);
        break;
      case "pipe":
        this.repairPipe(hotspot);
        break;
      case "emergency":
        this.useEmergencyJam();
        break;
    }

    this.renderHotspots();
    this.updateHud();
    this.checkWin();
  }

  getState() {
    return {
      runState: this.runState,
      pressure: this.pressure,
      timeLeft: this.timeLeft,
      cratesHeld: this.cratesHeld,
      jammed: this.jammed,
      routed: this.routed,
      emergencyUsed: this.emergencyUsed,
      nextAction: this.nextAction(),
    };
  }

  forceFail(): void {
    this.pressure = 100;
    this.finish("failed", "Compactor Breach", "The walls closed before the pipe routes were secured.");
  }

  private tick(now: number): void {
    const dt = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;

    if (this.active && this.runState === "playing") {
      const unresolvedPressure = (3 - this.jammed) * 0.08 + (3 - this.routed) * 0.1;
      this.pressure = Math.min(100, this.pressure + dt * (0.34 + unresolvedPressure));
      this.timeLeft = Math.max(0, this.timeLeft - dt);

      if (this.pressure >= 100) {
        this.finish("failed", "Compactor Breach", "The walls closed before the pipe routes were secured.");
      } else if (this.timeLeft <= 0) {
        this.finish("failed", "Shift Expired", "Corporate noted the delay with concern.");
      } else {
        this.updateHud();
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  }

  private renderHotspots(): void {
    this.layer.replaceChildren();
    for (const hotspot of CHAMBER_HOTSPOTS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = ["concept-hotspot", `concept-hotspot-${hotspot.kind}`, this.classFor(hotspot)]
        .filter(Boolean)
        .join(" ");
      button.dataset.hotspot = hotspot.id;
      button.style.left = `${hotspot.x}%`;
      button.style.top = `${hotspot.y}%`;
      button.style.width = `${hotspot.width}%`;
      button.style.height = `${hotspot.height}%`;
      button.ariaLabel = hotspot.label;
      button.disabled = this.isResolved(hotspot) || this.runState !== "playing";
      const label = document.createElement("span");
      label.textContent = this.textFor(hotspot);
      button.append(label);
      this.layer.append(button);
    }
  }

  private bindControls(): void {
    this.layer.addEventListener("pointerup", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".concept-hotspot");
      if (!button) return;
      event.preventDefault();
      this.activateHotspot(button.dataset.hotspot ?? "");
    });
    document.getElementById("concept-restart-button")?.addEventListener("click", () => this.reset());
  }

  private collectCrate(hotspot: ChamberHotspot): void {
    if (this.collectedCrates.has(hotspot.id)) return;
    this.collectedCrates.add(hotspot.id);
    this.cratesHeld += 1;
    this.statusText.textContent = "Crate grabbed. Drop it on a numbered jam plate.";
  }

  private jamPlate(hotspot: ChamberHotspot): void {
    if (this.jammedPlates.has(hotspot.id)) return;
    if (this.cratesHeld <= 0) {
      this.statusText.textContent = "A jam plate needs a crate first.";
      this.pressure = Math.min(100, this.pressure + 1.5);
      return;
    }
    this.cratesHeld -= 1;
    this.jammedPlates.add(hotspot.id);
    this.jammed += 1;
    this.pressure = Math.max(0, this.pressure - 8);
    this.statusText.textContent = `Jam plate locked: ${this.jammed}/3.`;
  }

  private repairPipe(hotspot: ChamberHotspot): void {
    if (this.repairedPipes.has(hotspot.id)) return;
    this.repairedPipes.add(hotspot.id);
    this.routed = Math.min(3, this.routed + 1);
    this.pressure = Math.max(0, this.pressure - 10);
    this.statusText.textContent = `${hotspot.label} repaired. Flow rerouted.`;
  }

  private useEmergencyJam(): void {
    if (this.emergencyUsed) {
      this.statusText.textContent = "Emergency Jam is recharging.";
      return;
    }
    this.emergencyUsed = true;
    this.pressure = Math.max(0, this.pressure - 22);
    this.statusText.textContent = "Emergency Jam fired. That bought a few seconds.";
  }

  private checkWin(): void {
    if (this.jammed >= 3 && this.routed >= 3 && this.pressure < 90) {
      this.finish("won", "Chamber Stabilized", "Pipes rerouted, plates jammed, and nobody got flattened.");
    }
  }

  private finish(state: ChamberRunState, title: string, detail: string): void {
    if (this.runState !== "playing") return;
    this.runState = state;
    this.stateTitle.textContent = title;
    this.stateDetail.textContent = detail;
    this.overlay.classList.remove("is-hidden");
    this.renderHotspots();
    this.updateHud();
  }

  private updateHud(): void {
    this.pressureText.textContent = `${Math.round(this.pressure)}%`;
    this.timeText.textContent = this.formatTime(this.timeLeft);
    this.crateText.textContent = `${this.cratesHeld}`;
    this.jamText.textContent = `${this.jammed}/3`;
    this.pipeText.textContent = `${this.routed}/3`;
    this.nextActionText.textContent = this.nextAction();
  }

  private classFor(hotspot: ChamberHotspot): string {
    if (this.isResolved(hotspot)) return "is-resolved";
    if (hotspot.kind === "pipe" && this.routed < 3) return "is-urgent";
    if (hotspot.kind === "jam" && this.cratesHeld > 0) return "is-ready";
    if (hotspot.kind === "crate" && this.cratesHeld === 0 && this.jammed < 3) return "is-needed";
    if (hotspot.kind === "emergency" && this.pressure >= 76) return "is-urgent";
    return "";
  }

  private textFor(hotspot: ChamberHotspot): string {
    if (hotspot.kind === "crate") return this.collectedCrates.has(hotspot.id) ? "Crate set" : "Crate";
    if (hotspot.kind === "jam") return this.jammedPlates.has(hotspot.id) ? "Jammed" : "Jam";
    if (hotspot.kind === "pipe") return this.repairedPipes.has(hotspot.id) ? "Routed" : "Repair";
    return this.emergencyUsed ? "Used" : "Jam";
  }

  private isResolved(hotspot: ChamberHotspot): boolean {
    return (
      this.collectedCrates.has(hotspot.id) ||
      this.jammedPlates.has(hotspot.id) ||
      this.repairedPipes.has(hotspot.id) ||
      (hotspot.kind === "emergency" && this.emergencyUsed)
    );
  }

  private formatTime(seconds: number): string {
    const whole = Math.ceil(seconds);
    return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  }

  private nextAction(): string {
    if (this.routed < 3) {
      return "Tap the red REPAIR ring on the toxic pipe.";
    }
    if (this.jammed < 3 && this.cratesHeld <= 0) {
      return "Tap a gold crate ring, then tap a numbered jam plate.";
    }
    if (this.jammed < 3) {
      return "Tap a glowing numbered plate to jam it with your crate.";
    }
    if (this.pressure >= 76 && !this.emergencyUsed) {
      return "Pressure is high: tap Emergency Jam to buy time.";
    }
    if (this.jammed >= 3 && this.routed >= 3) {
      return "Objectives green. Keep pressure under 90%.";
    }
    return "Stabilize routes and plates before pressure peaks.";
  }

  private requiredElement<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing #${id}`);
    return element as T;
  }

  private exposeTestHooks(): void {
    window.__TCP_CHAMBER_TEST__ = {
      getState: () => this.getState(),
      activateHotspot: (id: string) => this.activateHotspot(id),
      reset: () => this.reset(),
      forceFail: () => this.forceFail(),
    };
  }
}
