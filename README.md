# Image Generator

Single-page web app that generates images from a text prompt, optionally guided by an uploaded reference image (image-to-image). Built with Next.js App Router, TypeScript, and Tailwind v4, powered by [fal.ai](https://fal.ai) on the server so the API key never reaches the browser.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in FAL_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Environment variables

See `.env.example`. All fal.ai calls happen in server routes under `/api/*`, so `FAL_KEY` stays on the server.

```
FAL_KEY=<your fal.ai api key>
```

## Project layout

```
image-generator/
├── src/app/      Next.js App Router (UI + API routes)
├── public/       Static assets
├── docs/         Current project documentation
├── plans/        Approved implementation plans
└── strategy/     Research, briefs, exploration docs
```

## Documentation

- `strategy/plan.md` — original project brief (goals, tech stack, architecture, phased plan)
- `plans/plan.md` — approved implementation plan
- `docs/maintaining-docs.md` — how docs are organized

## Branch workflow

Develop on `rog`; `main` is for deployment.
