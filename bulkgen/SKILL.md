---
name: bulkgen
description: >-
  Bulk AI image generation via the BulkGen API. Use whenever users ask to generate
  one or many AI images — even simple requests like "generate an image" or "create AI art"
  should trigger this skill. Handles grids, batches, variations, reference-image editing,
  and Chinese prompts like "生成图片", "批量生成". Triggers: "generate images", "create AI art",
  "make a 3x3 grid", "generate variations", "edit this image", "style transfer".
---

# BulkGen Agent Skill

Generate AI images with BulkGen. Use the bundled scripts for API calls, downloads, and HTML previews.

## Setup

Set `BULKGEN_API_KEY` before calling the API.

```bash
export BULKGEN_API_KEY="sk_live_your_key_here"
```

### Missing key fallback

If the key is missing, tell the user:

> I need a BulkGen API key to generate images. Please open https://bulk-gen.com → user menu → API Keys → create a key, then either export `BULKGEN_API_KEY` or paste the key here.

## Quick start

```bash
# Single image
node scripts/generate.js --prompts "a sunset over mountains"

# 2x2 grid with different prompts
node scripts/generate.js --prompts "cat" "dog" "bird" "fish" --cols 2 --rows 2

# 3x3 variations of one concept
node scripts/generate.js --prompts "cyberpunk city" --mode variation --cols 3 --rows 3

# Edit image with reference
node scripts/generate.js --prompts "make it watercolor style" --input ./photo.jpg
```

## Generation modes

| Mode | Use case | Example |
|------|----------|---------|
| `solo` | One prompt → one image | Single illustration |
| `batch` | Multiple prompts → multiple images | 4 different product shots |
| `variation` | One prompt → creative variants | 9 style variations of a concept |

## Key options

| Option | Values | Default |
|--------|--------|---------|
| `--mode` | solo, batch, variation | batch |
| `--cols`, `--rows` | Grid dimensions | auto |
| `--resolution` | 1K, 2K, 4K | 1K |
| `--source-ratio` | 1:1, 16:9, 9:16, etc. | 1:1 |
| `--output-ratio` | Tile aspect ratio (may crop) | same as source |
| `--input` | Reference image path | none |

## Valid layouts

1x1, 2x1, 1x2, 3x1, 1x3, 2x2, 3x2, 2x3, 4x2, 2x4, 3x3, 4x3, 3x4, 4x4

## Reference images (editing)

Use `--input` to pass reference images for style transfer or editing:

```bash
# Style transfer
node scripts/generate.js --prompts "turn into oil painting" --input ./photo.jpg

# Multiple references
node scripts/generate.js --prompts "combine these" --input ./a.jpg --input ./b.jpg
```

Limits: up to 14 images, 7 MB each. Supported formats: PNG, JPG, WebP, HEIC, HEIF.

## Post-generation

### Download images locally

```bash
node scripts/download_images.js ./bulkgen-result.json ./downloads
```

Creates local files + `manifest.json` before signed URLs expire.

### Build HTML preview

```bash
node scripts/build_preview.js ./bulkgen-result.json ./preview.html
```

Creates a polished gallery page with grid preview and download buttons.

## Error handling

| Status | Meaning |
|--------|---------|
| 401 | Invalid API key |
| 402 | Insufficient credits (tell user to top up) |
| 400 | Invalid parameters |
| 500/502 | Server error, suggest retry |

## Workflow

1. Parse user intent → determine mode, layout, prompts
2. Run `generate.js` with appropriate options
3. If user wants to keep images → run `download_images.js`
4. If user wants a preview page → run `build_preview.js`
