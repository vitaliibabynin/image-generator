# Image Generator

Single-page web app that generates images from a text prompt, optionally guided by an uploaded reference image (image-to-image). Next.js App Router + TypeScript + Tailwind v4, powered by fal.ai on the server so the API key never ships to the client.

## Layout

```
image-generator/
├── src/app/          Next.js App Router (UI + API routes)
├── public/           Static assets
├── docs/             Current project documentation
├── plans/            Approved implementation plans
├── strategy/         Research, briefs, exploration docs
└── designs/          .pen design files (Pencil MCP only)
```

## Commands

```bash
npm run dev        # Start Next.js dev server
npm run build      # Production build
npm run start      # Serve production build
npm run lint       # ESLint
```

## Key rules

- **Branch workflow:** develop on `rog`, `main` is for deployment
- `FAL_KEY` is server-only — all fal.ai calls go through `/api/*` route handlers, never the browser
- Model IDs come from env vars (`FAL_MODEL_TEXT`, `FAL_MODEL_IMAGE`) so they can be swapped without code changes
- Uploads go to fal storage via `/api/upload`; we don't host files ourselves
- `.pen` files are encrypted — use Pencil MCP tools only, never Read/Write/Grep

## Documentation index

| Doc | What it covers |
|---|---|
| docs/maintaining-docs.md | How docs are organized and maintained |
| strategy/plan.md | Original project brief (goals, tech stack, architecture, phased plan) |
| plans/plan.md | Approved implementation plan |
