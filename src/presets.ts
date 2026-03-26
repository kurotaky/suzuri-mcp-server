export interface PlacementPreset {
  name: string;
  label: string;
  description: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  recommendedFor: string[];
  tags: string[];
}

export const PLACEMENT_PRESETS: PlacementPreset[] = [
  {
    name: "center",
    label: "中央配置",
    description: "素材をアイテムの中央に標準サイズで配置。最も汎用的で安定感のある配置",
    scale: 1.0,
    offsetX: 0.0,
    offsetY: 0.0,
    recommendedFor: ["tshirt", "hoodie", "tote", "mug"],
    tags: ["定番", "万能", "安定"],
  },
  {
    name: "left_chest",
    label: "左胸ワンポイント",
    description: "左胸の位置に小さく配置。ブランドロゴやワンポイントデザインに最適",
    scale: 0.3,
    offsetX: -0.25,
    offsetY: -0.2,
    recommendedFor: ["tshirt", "hoodie"],
    tags: ["ワンポイント", "ロゴ", "おしゃれ"],
  },
  {
    name: "right_chest",
    label: "右胸ワンポイント",
    description: "右胸の位置に小さく配置。左胸の対となる配置",
    scale: 0.3,
    offsetX: 0.25,
    offsetY: -0.2,
    recommendedFor: ["tshirt", "hoodie"],
    tags: ["ワンポイント", "ロゴ"],
  },
  {
    name: "full_front",
    label: "全面プリント",
    description: "素材を可能な限り大きく配置。インパクトのある全面デザインに",
    scale: 2.0,
    offsetX: 0.0,
    offsetY: 0.0,
    recommendedFor: ["tshirt", "hoodie", "tote"],
    tags: ["インパクト", "大胆", "アート"],
  },
  {
    name: "bottom_center",
    label: "下部中央配置",
    description: "アイテムの下部中央に配置。裾プリントのようなカジュアルな印象",
    scale: 0.6,
    offsetX: 0.0,
    offsetY: 0.3,
    recommendedFor: ["tshirt", "hoodie"],
    tags: ["カジュアル", "裾"],
  },
  {
    name: "top_center",
    label: "上部中央配置",
    description: "アイテムの上部中央に配置。文字やロゴを目立たせたいときに",
    scale: 0.5,
    offsetX: 0.0,
    offsetY: -0.25,
    recommendedFor: ["tshirt", "hoodie", "tote"],
    tags: ["ロゴ", "文字"],
  },
  {
    name: "pocket_area",
    label: "ポケット位置",
    description: "胸ポケットがある想定の位置に小さく配置。さりげないデザインに",
    scale: 0.25,
    offsetX: -0.2,
    offsetY: -0.15,
    recommendedFor: ["tshirt"],
    tags: ["さりげない", "ポケット"],
  },
  {
    name: "mug_wrap",
    label: "マグカップ全面",
    description: "マグカップの表面を覆うように大きく配置",
    scale: 1.5,
    offsetX: 0.0,
    offsetY: 0.0,
    recommendedFor: ["mug"],
    tags: ["マグカップ", "全面"],
  },
  {
    name: "small_center",
    label: "中央小サイズ",
    description: "中央にコンパクトに配置。ミニマルなデザインに",
    scale: 0.5,
    offsetX: 0.0,
    offsetY: 0.0,
    recommendedFor: ["tshirt", "hoodie", "tote", "mug"],
    tags: ["ミニマル", "シンプル"],
  },
];

export function findPreset(name: string): PlacementPreset | undefined {
  return PLACEMENT_PRESETS.find((p) => p.name === name);
}

export function getPresetsForCategory(category?: string): PlacementPreset[] {
  if (!category || category === "all") return PLACEMENT_PRESETS;
  return PLACEMENT_PRESETS.filter((p) => p.recommendedFor.includes(category));
}

export function resolvePlacementParams(options: {
  presetName?: string;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}): { scale: number; offsetX: number; offsetY: number } {
  const preset = options.presetName ? findPreset(options.presetName) : undefined;
  return {
    scale: options.scale ?? preset?.scale ?? 1.0,
    offsetX: options.offsetX ?? preset?.offsetX ?? 0.0,
    offsetY: options.offsetY ?? preset?.offsetY ?? 0.0,
  };
}
