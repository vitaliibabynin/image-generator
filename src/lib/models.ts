export type AspectRatio = "1:1" | "3:2" | "16:9";

export function aspectToImageSize(ratio: AspectRatio) {
  switch (ratio) {
    case "1:1":
      return "square_hd";
    case "3:2":
      return "landscape_4_3";
    case "16:9":
      return "landscape_16_9";
  }
}

export interface ModelFeatures {
  aspectRatio: boolean;
  steps: { min: number; max: number; default: number } | null;
  guidance: boolean;
  strength: boolean;
  safetyChecker: boolean;
}

export interface ModelConfig {
  id: string;
  label: string;
  tagline: string;
  textEndpoint: string;
  editEndpoint?: string;
  features: ModelFeatures;
}

export const MODEL_CATALOG: ModelConfig[] = [
  {
    id: "nano-banana",
    label: "Nano Banana",
    tagline: "google · gemini flash image",
    textEndpoint: "fal-ai/nano-banana",
    editEndpoint: "fal-ai/nano-banana/edit",
    features: {
      aspectRatio: false,
      steps: null,
      guidance: false,
      strength: false,
      safetyChecker: false,
    },
  },
  {
    id: "flux-schnell",
    label: "FLUX · schnell",
    tagline: "black forest labs · fast",
    textEndpoint: "fal-ai/flux/schnell",
    features: {
      aspectRatio: true,
      steps: { min: 1, max: 12, default: 4 },
      guidance: false,
      strength: false,
      safetyChecker: true,
    },
  },
  {
    id: "flux-dev",
    label: "FLUX · dev",
    tagline: "black forest labs · quality",
    textEndpoint: "fal-ai/flux/dev",
    editEndpoint: "fal-ai/flux/dev/image-to-image",
    features: {
      aspectRatio: true,
      steps: { min: 1, max: 50, default: 28 },
      guidance: true,
      strength: true,
      safetyChecker: true,
    },
  },
  {
    id: "flux-pro",
    label: "FLUX · pro 1.1",
    tagline: "black forest labs · top",
    textEndpoint: "fal-ai/flux-pro/v1.1",
    features: {
      aspectRatio: true,
      steps: null,
      guidance: false,
      strength: false,
      safetyChecker: false,
    },
  },
  {
    id: "ideogram-v3",
    label: "Ideogram v3",
    tagline: "typography · stylized",
    textEndpoint: "fal-ai/ideogram/v3",
    features: {
      aspectRatio: true,
      steps: null,
      guidance: false,
      strength: false,
      safetyChecker: false,
    },
  },
];

export const DEFAULT_MODEL_ID = "nano-banana";

export function getModel(id?: string): ModelConfig {
  return MODEL_CATALOG.find((m) => m.id === id) ?? MODEL_CATALOG[0];
}

export function modelSupportsI2I(m: ModelConfig): boolean {
  return Boolean(m.editEndpoint);
}

export function firstI2IModel(): ModelConfig {
  return MODEL_CATALOG.find(modelSupportsI2I) ?? MODEL_CATALOG[0];
}
