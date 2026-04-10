# Image Generator Webapp — Strategy

## Overview
A web application that lets visitors generate images from a text prompt, or from an uploaded image combined with a prompt (image-to-image). Built with Next.js (App Router), TypeScript, Tailwind CSS, and powered by [fal.ai](https://fal.ai) for inference.

## Goals
- Simple, single-page experience: type a prompt, optionally upload an image, click generate, see result.
- Fast feedback: show loading states and stream progress where possible.
- Keep API keys secret — all fal.ai calls go through server-side routes.
- Mobile-friendly and responsive.

## Tech Stack
| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server components + route handlers in one codebase |
| Language | TypeScript | Type safety for API payloads |
| Styling | Tailwind CSS v4 | Fast iteration, utility-first |
| AI Provider | fal.ai (`@fal-ai/client`) | Text-to-image + image-to-image models, streaming support |
| Image Upload | fal.ai storage (`fal.storage.upload`) | Avoids hosting files ourselves |
| Deployment | Vercel (suggested) | Native Next.js support |

## fal.ai Models (proposed)
- **Text-to-image:** `fal-ai/flux/schnell` (fast, free tier friendly) or `fal-ai/flux/dev` (higher quality).
- **Image-to-image:** `fal-ai/flux/dev/image-to-image` or `fal-ai/flux-lora/image-to-image`.
- Models should be configurable via env var so we can swap without code changes.

## Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌──────────────┐
│  Client (React) │ ─────► │  Next.js Route   │ ─────► │   fal.ai     │
│   - PromptForm  │        │   Handlers       │        │   models     │
│   - ImageUpload │ ◄───── │  /api/generate   │ ◄───── │              │
│   - ResultView  │        │  /api/upload     │        │              │
└─────────────────┘        └──────────────────┘        └──────────────┘
```

### Why a server route and not call fal directly from the browser?
The `FAL_KEY` must never ship to the client. Route handlers keep it on the server and also let us add rate limiting, logging, and model switching later.

## Project Structure
```
image-generator/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # main UI
│   │   ├── globals.css
│   │   └── api/
│   │       ├── generate/route.ts    # POST → fal.ai text-to-image or image-to-image
│   │       └── upload/route.ts      # POST → uploads file to fal storage, returns URL
│   ├── components/
│   │   ├── PromptForm.tsx           # textarea + submit
│   │   ├── ImageDropzone.tsx        # drag-and-drop upload
│   │   ├── ResultGallery.tsx        # shows generated image(s)
│   │   └── LoadingSpinner.tsx
│   ├── lib/
│   │   ├── fal.ts                   # fal client singleton + model IDs
│   │   └── types.ts                 # request/response types
│   └── hooks/
│       └── useGenerate.ts           # client hook wrapping /api/generate
├── public/
├── strategy/
│   └── plan.md                      # this file
├── .env.local                       # FAL_KEY=...
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## User Flow
1. User lands on `/`.
2. They type a prompt (required).
3. Optionally, drag an image into the dropzone. If present, app switches to image-to-image mode.
4. Click **Generate**.
5. Client POSTs to `/api/generate` with `{ prompt, imageUrl? }`.
6. If an image was uploaded, it's first sent to `/api/upload`, which forwards to fal storage and returns a public URL.
7. Server route calls fal.ai, awaits result, returns `{ imageUrl }`.
8. Client shows the image with download button and "generate another" action.

## API Contracts

### `POST /api/upload`
Request: `multipart/form-data` with `file`
Response: `{ url: string }`

### `POST /api/generate`
Request:
```ts
{
  prompt: string;
  imageUrl?: string;   // if present → image-to-image
  strength?: number;   // 0-1, only for image-to-image
}
```
Response:
```ts
{
  imageUrl: string;
  seed?: number;
  model: string;
}
```

## Environment Variables
```
FAL_KEY=<your fal.ai api key>
FAL_MODEL_TEXT=fal-ai/flux/schnell
FAL_MODEL_IMAGE=fal-ai/flux/dev/image-to-image
```

## UI Sketch
- Centered column, max-w-2xl.
- Heading + short tagline.
- Prompt textarea (auto-resize).
- Collapsible "Add reference image" dropzone.
- Big "Generate" button (disabled until prompt has text).
- Result area below: skeleton while loading, then image with download + regenerate buttons.
- Dark mode by default, light toggle optional.

## Implementation Phases
1. **Scaffold** — `create-next-app` with TS + Tailwind, commit.
2. **fal client** — install `@fal-ai/client`, set up `lib/fal.ts`, add env vars.
3. **Text-to-image path** — `/api/generate` (prompt only) + `PromptForm` + `ResultGallery`. Verify end-to-end.
4. **Upload path** — `/api/upload` using fal storage, wire up `ImageDropzone`.
5. **Image-to-image path** — extend `/api/generate` to branch on `imageUrl` presence.
6. **Polish** — loading states, error toasts, responsive tweaks, download button.
7. **Optional** — rate limiting (Upstash), prompt history in localStorage, multiple variants per request.

## Risks & Open Questions
- **Cost / abuse:** public endpoint with no auth can rack up fal.ai bills. Consider IP-based rate limiting or a simple turnstile/captcha before launch.
- **Model choice:** `flux/schnell` is cheap but lower quality; `flux/dev` is better but slower. Decision depends on target audience.
- **Large uploads:** fal storage handles this, but we should cap file size client-side (e.g. 10 MB) before sending.
- **NSFW / content policy:** fal.ai has built-in safety, but we may want our own prompt filter.

## Next Step
Approve this plan, then scaffold the Next.js app and wire up the text-to-image path first (phases 1–3).
