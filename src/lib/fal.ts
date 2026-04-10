import { fal } from "@fal-ai/client";

let configured = false;

export function getFal() {
  if (!configured) {
    const credentials = process.env.FAL_KEY;
    if (!credentials) {
      throw new Error("FAL_KEY is not set on the server");
    }
    fal.config({ credentials });
    configured = true;
  }
  return fal;
}
