---
name: playwriter
description: Browser automation using Playwriter CLI — navigate, click, type, screenshot, scrape
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - Write
---

# Playwriter Browser Automation

Use the **Playwriter CLI** (`npx playwriter`) for browser tasks via Bash.

## Critical: Playwriter CLI, NOT MCP and NOT Playwright

- **Playwriter CLI** — Run commands via `npx playwriter "<command>"` in Bash.
- Do NOT use `mcp__playwriter__execute` or `mcp__playwriter__reset` — MCP is not configured.
- **Playwright** = unrelated npm package. Do NOT install it or reference it.

## Usage

```bash
npx playwriter "<command>"
```

Execute the user's browser task using `npx playwriter` via Bash. Take screenshots to verify state. Return results concisely.

$ARGUMENTS
