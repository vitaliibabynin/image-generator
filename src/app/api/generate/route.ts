import { NextResponse } from "next/server";
import { getFal } from "@/lib/fal";
import { aspectToImageSize, getModel, modelSupportsI2I } from "@/lib/models";
import type { GenerateRequest, GenerateResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface FalImageOutput {
  images?: { url: string; width?: number; height?: number }[];
  seed?: number;
}

export async function POST(request: Request) {
  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const model = getModel(body.modelId);
  const isImageToImage = Boolean(body.imageUrl);

  if (isImageToImage && !modelSupportsI2I(model)) {
    return NextResponse.json(
      { error: `${model.label} does not support image-to-image` },
      { status: 400 },
    );
  }

  const endpoint = isImageToImage
    ? (model.editEndpoint as string)
    : model.textEndpoint;

  const input: Record<string, unknown> = {
    prompt,
    num_images: 1,
  };

  if (model.features.aspectRatio) {
    input.image_size = aspectToImageSize(body.aspectRatio ?? "3:2");
  }
  if (model.features.steps) {
    input.num_inference_steps = clamp(
      body.steps ?? model.features.steps.default,
      model.features.steps.min,
      model.features.steps.max,
    );
  }
  if (model.features.guidance) {
    input.guidance_scale = clamp(body.guidance ?? 3.5, 0, 20);
  }
  if (model.features.safetyChecker) {
    input.enable_safety_checker = true;
  }

  if (isImageToImage) {
    if (model.id === "nano-banana") {
      input.image_urls = [body.imageUrl];
    } else {
      input.image_url = body.imageUrl;
      if (model.features.strength) {
        input.strength = clamp(body.strength ?? 0.85, 0, 1);
      }
    }
  }

  const start = Date.now();
  try {
    const fal = getFal();
    const result = await fal.subscribe(endpoint, { input, logs: false });
    const data = result.data as FalImageOutput;
    const first = data?.images?.[0];
    if (!first?.url) {
      return NextResponse.json(
        { error: "Model returned no image" },
        { status: 502 },
      );
    }
    const payload: GenerateResponse = {
      imageUrl: first.url,
      width: first.width ?? 0,
      height: first.height ?? 0,
      seed: data.seed,
      model: endpoint,
      modelId: model.id,
      durationMs: Date.now() - start,
    };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
