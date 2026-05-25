export type TrashCategory = "recycle" | "organic" | "toxic";

export interface TrashDefinition {
  category: TrashCategory;
  label: string;
  icon: string;
  asset: string;
  chuteAsset: string;
  color: number;
  uiColor: string;
  scoreValue: number;
}

export const TRASH_DEFINITIONS: Record<TrashCategory, TrashDefinition> = {
  recycle: {
    category: "recycle",
    label: "Recyclables",
    icon: "triangle arrows",
    asset: "trash-recycle",
    chuteAsset: "chute-recycle",
    color: 0x1c9be8,
    uiColor: "#1c9be8",
    scoreValue: 100,
  },
  organic: {
    category: "organic",
    label: "Organics",
    icon: "leaf",
    asset: "trash-organic",
    chuteAsset: "chute-organic",
    color: 0x7fcb2e,
    uiColor: "#7fcb2e",
    scoreValue: 100,
  },
  toxic: {
    category: "toxic",
    label: "Toxic",
    icon: "skull",
    asset: "trash-toxic",
    chuteAsset: "chute-toxic",
    color: 0xa34deb,
    uiColor: "#a34deb",
    scoreValue: 125,
  },
};

export const PROTOTYPE_LEVEL = {
  targetSorts: 15,
  timeLimitSeconds: 105,
  basePressurePerSecond: 0.72,
  jamPressurePerSecond: -0.24,
  clutterPressurePerItem: 0.035,
  wrongSortPressurePenalty: 7,
  spawnDelayMs: 1450,
  maxLooseTrash: 10,
};

export const PLAY_AREA = {
  left: 245,
  right: 1035,
  top: 92,
  bottom: 628,
  tileSize: 64,
};

