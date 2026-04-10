# Maintaining Documentation

This guide defines how documentation is organized, what goes where, and how to keep it current.

## Folder structure

| Folder | Purpose | Content type |
|---|---|---|
| `docs/` | Current state of the project | Architecture, tech decisions, conventions, setup guides |
| `plans/` | Approved implementation plans | Step-by-step plans for features we've decided to build |
| `plans/archive/` | Completed plans | Plans that have been fully implemented (moved here for reference) |
| `strategy/` | Research and exploration | Project briefs, tech evaluations, ideas under consideration |

## Rules

### docs/ — living documentation
- Describes the project **as it is now**, not as it was or will be
- Update docs whenever you change code that affects documented behavior
- Each doc should cover one topic and be self-contained
- Keep individual docs under 300 lines — split if they grow beyond that
- Remove references to things that no longer exist
- Don't document code that is self-explanatory — focus on the "why" and "how things connect"

### plans/ — implementation blueprints
- A plan describes **what we will build** and **how**, with enough detail to execute
- Move to `plans/archive/` once fully implemented
- Plans can reference docs and strategy files but should be self-contained enough to act on
- Name format: `<feature-name>.md` (e.g., `image-to-image.md`, `rate-limiting.md`)

### strategy/ — research and exploration
- Contains the original project brief and early planning notes
- Add new files here for research, comparisons, or ideas that haven't been approved yet
- Strategy docs may become plans once a decision is made
- These files are not actively maintained — they represent thinking at a point in time

### CLAUDE.md — project entry point
- Lives at the repo root
- Provides a concise project overview and lists which docs have more detail
- Loads into every Claude Code conversation, so keep it short and high-signal
- Link to other docs as plain text paths (e.g. `docs/architecture.md`), not with `@` — `@` would pull them into context on every turn

## Routing table — what goes where

| Information | Location |
|---|---|
| Project overview, key rules, doc index | `CLAUDE.md` |
| How the codebase is structured | `docs/architecture.md` |
| fal.ai integration, model config, API routes | `docs/fal-integration.md` |
| UI/design conventions | `docs/ui-design.md` |
| Environment variables and local setup | `docs/setup.md` |
| How to maintain these docs | `docs/maintaining-docs.md` |
| Original project brief | `strategy/plan.md` |
| Approved implementation plan | `plans/plan.md` |

Not all of these docs exist yet. Create them as the relevant features are implemented.
