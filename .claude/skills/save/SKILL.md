---
name: save
description: Review all changes, improve code quality, fix errors, update documentation, and push to rog branch
disable-model-invocation: true
---

Perform a full review, cleanup, and commit of all changes since the last git commit. Follow every step below in order. Do not skip steps.

## 1. Review changes

Run `git diff` and `git status` to understand everything that changed since the last commit. Read new and modified files to understand the full scope.

## 2. Improve code quality

Look for opportunities to make the code simpler, smaller, and more maintainable:

- Replace hardcoded values with variables or constants
- Extract repeated code into shared utility functions
- Remove dead code, unused imports, and redundant comments
- Simplify overly complex logic
- Ensure new code follows existing patterns and conventions in the codebase

Only make improvements that are clearly beneficial. Do not over-engineer or add unnecessary abstractions.

## 3. Check for errors

Run these checks and fix every error found:

- **TypeScript**: `npx tsc --noEmit`
- **Lint**: `npm run lint`
- **Build**: `npm run build` (only if the change touches build-affecting code — Next.js config, routes, server components)

Fix all errors by addressing root causes. Do NOT suppress errors with `@ts-ignore`, `eslint-disable`, `any` type casts, or similar ignore flags. If an error genuinely cannot be fixed, explain exactly why.

## 4. Update documentation

- Read `README.md` and any files in `plans/` or `strategy/` and check whether the changes from step 1 require updates
- Update each doc that is out of date — add new sections, correct stale information, remove references to things that no longer exist
- If `CLAUDE.md` exists, keep it concise (project structure overview, key rules, doc index) since it loads into every conversation

## 5. Commit and push to rog

Stage all changes (code improvements + doc updates) and commit with a clear message describing what changed and why. Follow the repository's commit message style (see recent `git log`).

Make sure you are on the `rog` branch. If not, switch to it first. Push to origin:

```bash
git push origin rog
```
