import type { AspectRatio } from "./models";

export interface GenerateRequest {
  prompt: string;
  imageUrl?: string;
  modelId?: string;
  aspectRatio?: AspectRatio;
  steps?: number;
  guidance?: number;
  strength?: number;
}

export interface GenerateResponse {
  imageUrl: string;
  width: number;
  height: number;
  seed?: number;
  model: string;
  modelId: string;
  durationMs: number;
}

export interface UploadResponse {
  url: string;
  name: string;
  size: number;
}
