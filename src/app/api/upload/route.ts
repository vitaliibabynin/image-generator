import { NextResponse } from "next/server";
import { getFal } from "@/lib/fal";
import type { UploadResponse } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
        { status: 413 },
      );
    }

    const fal = getFal();
    const url = await fal.storage.upload(file);

    const body: UploadResponse = {
      url,
      name: file.name,
      size: file.size,
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
