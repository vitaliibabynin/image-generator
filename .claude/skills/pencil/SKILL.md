---
name: pencil
description: Working with Pencil MCP tools and .pen design files. Use this skill whenever the user wants to create, edit, view, or work with .pen files, design screens, UI mockups, or prototypes using the Pencil design editor. Also trigger when the user mentions Pencil, .pen files, design tasks involving frames/components/layouts, or wants to open or modify visual designs. Trigger even if the user just says "open the design" or references a .pen file path. This skill ensures all tool schemas are loaded before use, preventing parameter errors on first call.
---

# Pencil MCP Design Skill

## Step 0: Load All Tool Schemas (MANDATORY)

Pencil MCP tools are **deferred** in Claude Code. Their parameter schemas are not available until explicitly fetched. If you skip this step, you'll use wrong parameter names and get errors (e.g., `filePathOrNew` when the real parameter is `filePathOrTemplate`).

**Before ANY Pencil tool call, run this single ToolSearch to load every Pencil tool at once:**

```
ToolSearch(query="select:mcp__pencil__get_editor_state,mcp__pencil__open_document,mcp__pencil__batch_design,mcp__pencil__batch_get,mcp__pencil__get_screenshot,mcp__pencil__get_guidelines,mcp__pencil__get_style_guide,mcp__pencil__get_style_guide_tags,mcp__pencil__get_variables,mcp__pencil__set_variables,mcp__pencil__snapshot_layout,mcp__pencil__find_empty_space_on_canvas,mcp__pencil__export_nodes,mcp__pencil__replace_all_matching_properties,mcp__pencil__search_all_unique_properties", max_results=15)
```

Only proceed to Step 1 after ToolSearch returns the schemas successfully.

## Step 1: Get Editor State

Always start here to understand context — what file is open, what's selected, what frames exist:

```
mcp__pencil__get_editor_state(include_schema=true)
```

- `include_schema=true` on the **first** call to get the .pen file format schema
- `include_schema=false` on subsequent calls (schema already loaded, saves tokens)
- If this returns "no file open", proceed to Step 2

## Step 2: Open a Document (if needed)

If no file is open, or you need a different file:

```
mcp__pencil__open_document(filePathOrTemplate="<absolute-path>")   // existing file
mcp__pencil__open_document(filePathOrTemplate="new")               // blank canvas
```

After opening, call `get_editor_state` again to see the document contents.

## Step 3: Guidelines & Style (for creative/design tasks)

For designing new screens, pages, or apps — skip for simple edits:

```
mcp__pencil__get_guidelines(topic="...")
// Valid topics: code, table, tailwind, landing-page, slides, design-system, mobile-app, web-app
```

For style inspiration:
```
mcp__pencil__get_style_guide_tags()        // see available tags
mcp__pencil__get_style_guide(tags=[...])   // get a style guide
```

## Step 4: Explore Existing Design

Read nodes, understand structure, check variables. The `filePath` parameter is required on most tools — always pass the absolute path to the .pen file:

```
mcp__pencil__batch_get(filePath="<absolute-path>", nodeIds=["id1","id2"], readDepth=3)
mcp__pencil__batch_get(filePath="<absolute-path>", patterns=[{reusable: true}])
mcp__pencil__get_variables(filePath="<absolute-path>")
mcp__pencil__snapshot_layout(filePath="<absolute-path>", parentId="frameId", maxDepth=3)
```

## Step 5: Design (batch_design)

Create and modify designs with batch operations:

```
mcp__pencil__batch_design(filePath="<absolute-path>", operations="<js-like operation string>")
```

- **Max 25 operations per call** — split larger designs into multiple calls
- When copying nodes and modifying descendants, use the `descendants` property in the Copy operation — never use separate Update operations for copied node descendants (IDs change on copy)

## Step 6: Verify with Screenshot

Always screenshot after making changes to confirm they look right:

```
mcp__pencil__get_screenshot(filePath="<absolute-path>", nodeId="frameId")
```

## Critical Rules

### .pen files are encrypted
Never use Read, Grep, Write, or Edit tools on .pen files. Only Pencil MCP tools can read or modify their contents. Standard file tools will return garbage.

### Placeholder workflow
When working on frames, follow this protocol strictly:

1. **Set `placeholder: true`** on any frame you start working on
2. **Keep the flag** for the entire duration of work on that frame
3. **Remove `placeholder: true`** only when you're completely finished with that frame
4. When creating multiple screens: create ALL placeholder frames first, then work on each one by one
5. Never leave `placeholder: true` on a finished frame

### Text requires fill color
Text has no color by default — it will be **invisible**. Always set the `fill` property on text nodes.

### Text sizing rules
- `textGrowth` must be set before `width`/`height` have any effect on text
- `"auto"` (default): text auto-sizes, no wrapping — don't set width/height
- `"fixed-width"`: set `width`, height auto-calculated from content — text wraps
- `"fixed-width-height"`: set both `width` and `height` — text wraps and may overflow
- Never guess text dimensions — use flexbox layout + `fill_container` to size text

### Images are fills, not nodes
There is no "image" node type. Images are fills on frame/rectangle nodes. Use `G()` in batch_design to apply images.

### Flexbox over absolute positioning
- Prefer flexbox layout (`layout: "horizontal"` or `"vertical"`) over absolute positioning
- When parent has flexbox, `x` and `y` on children are **ignored** — don't set them
- Use `fill_container` and `fit_content` for dynamic sizing instead of hardcoded pixels

## File Organization

All `.pen` files should live in the `designs/` folder at the project root. When creating new designs, save them to `designs/<descriptive-name>.pen`. Use `Glob(pattern="designs/**/*.pen")` to find existing design files when the user doesn't specify which file to work on.
