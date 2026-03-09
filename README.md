# BulkGen Skill

BulkGen skill for AI agents. Generate one or many AI images with a single request, edit images with reference photos, auto-resolve compatible grid/source ratios, and optionally package the result into a lightweight HTML preview page with download buttons.

## Install

```bash
npx skills add oil-oil/bulkgen
```

## Setup

```bash
export BULKGEN_API_KEY="sk_live_your_key_here"
```

If the key is not configured yet, get it from `https://bulk-gen.com`:

1. Log in
2. Open the user menu
3. Choose `API Keys`
4. Create a new key
5. Export it locally or paste it to the agent for the current task

## What it does

- Generate single images, grids, and variation sets
- Edit images with reference photos (style transfer, compositing)
- Auto-pick a compatible source ratio when the user only cares about output ratio
- Stop early on unsupported layout / ratio combinations instead of sending a bad request
- Return signed image URLs from BulkGen
- Build a polished HTML preview page for a generation result
- Download expiring signed-image results to a local folder
- Add per-image download buttons for handoff and review

## Skill contents

- `bulkgen/SKILL.md`: trigger + workflow instructions
- `bulkgen/scripts/generate.js`: generate images with layout / ratio validation
- `bulkgen/scripts/build_preview.js`: build preview HTML from generation JSON
- `bulkgen/scripts/download_images.js`: download generated images locally from result JSON
- `bulkgen/assets/html-preview-template/template.html`: reusable preview template
