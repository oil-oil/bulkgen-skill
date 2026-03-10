---
name: bulkgen
description: >-
  Bulk AI image generation via the BulkGen API. Use whenever users ask to generate
  one or many AI images — even simple requests like "generate an image", "edit this image",
  "make variations", or "create AI art" should trigger this skill. Handles single images,
  grids, variations, reference-image editing, expiring result downloads, and HTML
  preview handoff pages. Works for English and Chinese requests like "生成图片", "批量生成",
  "图生图", "做一个 3x3 宫格", or "给我做九宫格变体".
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

---

## Quick start

```bash
# Single image
node scripts/generate.js --prompts "a sunset over mountains" --mode solo

# 2x2 grid with different prompts on a square canvas
node scripts/generate.js --prompts "cat" "dog" "bird" "fish" --cols 2 --rows 2 --canvas-ratio 1:1

# 3x3 variations on a portrait canvas
node scripts/generate.js --prompts "cyberpunk city" --mode variation --cols 3 --rows 3 --canvas-ratio 4:5

# Edit image with reference
node scripts/generate.js --prompts "make it watercolor style" --input ./photo.jpg
```

---

## Generation modes

| Mode | Use case | Prompts needed | Output |
|------|----------|----------------|--------|
| `solo` | One prompt → one image | 1 | 1 image |
| `batch` | Multiple prompts → multiple images | N (one per cell) | N images |
| `variation` | One prompt → creative variants | 1 | N images (same subject, different styles) |

---

## Key options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--mode` | solo, batch, variation | batch | Generation mode |
| `--cols`, `--rows` | Grid dimensions | auto | Number of columns and rows |
| `--resolution` | 1K, 2K, 4K | 1K | Output resolution (higher = more credits) |
| `--canvas-ratio` | See below | 1:1 | Aspect ratio of the **full output canvas** |
| `--source-ratio` | See below | auto | Aspect ratio for AI generation (usually auto) |
| `--input` | File path | none | Reference image(s) for editing |
| `--output` | File path | ./bulkgen-result.json | Where to save the result JSON |

---

## Layout and ratio rules

### Valid layouts

```
1x1, 2x1, 1x2, 3x1, 1x3, 2x2, 3x2, 2x3, 4x2, 2x4, 3x3, 4x3, 3x4, 4x4
```

### Supported aspect ratios

```
1:1, 3:2, 2:3, 4:3, 3:4, 16:9, 9:16, 4:5, 5:4, 21:9
```

### Understanding canvas-ratio vs source-ratio

- **`--canvas-ratio`**: The aspect ratio of the **full output canvas** (the entire grid), NOT a single cell. For a 3x3 grid with `--canvas-ratio 1:1`, each cell will be square.
- **`--source-ratio`**: The aspect ratio sent to the AI model. Usually you don't need this — the script auto-picks the best compatible value.
- **Tile ratio**: The per-cell aspect ratio is **derived automatically** from `canvas-ratio + cols + rows`. You don't specify it directly.

Example: A 3x3 grid with `--canvas-ratio 9:16` produces 9 portrait cells, each with 9:16 aspect ratio.

### When layouts and ratios don't match

Some combinations are mathematically impossible. The script will error and suggest alternatives:

```
Error: Layout 3x3 does not support canvas-ratio "21:9".
```

In this case, try a different layout or canvas-ratio.

---

## Reference images (editing)

Use `--input` to pass reference images for style transfer or editing:

```bash
# Style transfer
node scripts/generate.js --prompts "turn into oil painting" --input ./photo.jpg

# Multiple references
node scripts/generate.js --prompts "combine these" --input ./a.jpg --input ./b.jpg
```

Limits: up to 14 images, 7 MB each. Supported formats: PNG, JPG, WebP, HEIC, HEIF.

---

## API response structure

The `generate.js` script saves a JSON file with this structure:

```json
{
  "images": [
    {
      "id": "uuid-here",
      "url": "https://signed-url-that-expires.png",
      "filePath": "user/timestamp-1-uuid.png",
      "expiresAt": "2026-03-11T00:00:00.000Z"
    }
  ],
  "mode": "batch",
  "cols": 2,
  "rows": 2,
  "resolution": "1K",
  "canvasRatio": "1:1",
  "sourceRatio": "1:1",
  "tileRatio": "1:1",
  "prompts": ["cat", "dog", "bird", "fish"],
  "credits": {
    "charged": 100,
    "remaining": 9900
  },
  "expiresAt": "2026-03-11T00:00:00.000Z"
}
```

**Important**: Image URLs are signed and expire (typically 12 hours). Download images promptly if you need permanent copies.

---

## Post-generation

### Download images locally

```bash
node scripts/download_images.js ./bulkgen-result.json ./downloads
```

This downloads all images to `./downloads/` and creates `manifest.json` with metadata:

```json
{
  "source": "./bulkgen-result.json",
  "downloadedAt": "2026-03-10T12:00:00.000Z",
  "expiresAt": "2026-03-11T00:00:00.000Z",
  "imageCount": 4,
  "items": [
    {
      "index": 1,
      "id": "uuid-here",
      "localPath": "./downloads/01-image-uuid.png",
      "sizeBytes": 123456
    }
  ]
}
```

### Build HTML preview page

```bash
node scripts/build_preview.js ./bulkgen-result.json ./preview.html
```

Creates a polished, self-contained HTML gallery with:
- Grid preview showing all images in their original layout
- Per-image download buttons
- Prompt reference for each tile
- Generation metadata (mode, layout, resolution)

The HTML file is fully self-contained — share it or open offline.

---

## Error handling

| Status | Meaning | What to tell user |
|--------|---------|-------------------|
| 401 | Invalid API key | Get a new key at https://bulk-gen.com |
| 402 | Insufficient credits | Top up credits at https://bulk-gen.com |
| 400 | Invalid parameters | Check layout/ratio compatibility, prompts |
| 500/502 | Server error | Retry the request |

Common 400 errors:
- "Unsupported layout" → Use a valid layout from the list above
- "does not support canvas-ratio" → Try a different canvas-ratio or layout
- "Please enter at least one prompt" → Provide at least one non-empty prompt

---

## Complete workflow example

Here's a typical end-to-end flow:

```bash
# 1. Generate a 3x3 grid of variations
node scripts/generate.js \
  --prompts "minimalist product photography of a ceramic vase, soft lighting" \
  --mode variation \
  --cols 3 --rows 3 \
  --canvas-ratio 4:5 \
  --resolution 2K \
  --output ./my-generation.json

# 2. Download images before URLs expire
node scripts/download_images.js ./my-generation.json ./my-images

# 3. Build a preview page to share
node scripts/build_preview.js ./my-generation.json ./my-preview.html

# 4. Open the preview
open ./my-preview.html
```

---

## Workflow summary

1. **Parse user intent** → Determine mode, layout, prompts, canvas ratio, and whether reference images are needed
2. **Run `generate.js`** with appropriate options → Saves result JSON
3. **If user needs permanent copies** → Run `download_images.js` before URLs expire
4. **If user needs a shareable preview** → Run `build_preview.js`
