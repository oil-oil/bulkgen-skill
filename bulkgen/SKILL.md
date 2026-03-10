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

## Before generating: clarify parameters

**Always confirm ambiguous parameters before running generate.js.** Do not assume defaults silently.

### When to ask

| User says | Need to ask? | Reason |
|-----------|--------------|--------|
| "生成一张猫的图" | No | Solo mode is clear |
| "生成 9 张图" | **Yes: ratio + mode** | Both are ambiguous |
| "做个九宫格变体" | **Yes: ratio** | Mode is clear (variation), ratio is not |
| "生成 4 张不同产品图" | **Yes: ratio** | Mode is batch, ratio is not |
| "生成 16 张 4K 横屏海报" | No | All parameters specified |

### Infer from use case

When user mentions a specific use case, infer the ratio:

| Use case / Platform | Suggested ratio | Notes |
|---------------------|-----------------|-------|
| 手机壁纸 / Phone wallpaper | 9:16 | Portrait, full screen |
| 小红书封面 / Xiaohongshu cover | 3:4 | Portrait, slightly wider |
| 公众号封面 / WeChat cover | 2.35:1 or 16:9 | Wide banner |
| 抖音封面 / Douyin cover | 9:16 | Same as phone wallpaper |
| 电商主图 / E-commerce | 1:1 | Square, platform standard |
| 海报 / Poster | 3:4 or 2:3 | Portrait poster |
| 横屏 / Landscape / 宽屏 | 16:9 | Standard widescreen |
| 社交媒体 / Social media | 1:1 or 4:5 | Instagram-style |
| Presentation / PPT | 16:9 | Slide format |

If you infer a ratio, briefly confirm: *"我会用 9:16 竖屏比例生成，对吗？"*

### How to ask (with explanations)

When asking, explain the options so the user can make an informed choice.

**Example 1: User says "生成 9 张图"**

> 我准备生成 9 张图片，有两个参数需要确认：
>
> 1. **图片比例**：
>    - 方形 (1:1) — 适合电商主图、社交媒体
>    - 竖屏 (9:16) — 适合手机壁纸、小红书、抖音
>    - 横屏 (16:9) — 适合海报、PPT、视频封面
>
> 2. **生成模式**：
>    - **变体 (variation)** — 同一个主题，9 张风格各异的变体
>    - **批量 (batch)** — 你提供 9 个不同的提示词，每张图内容独立
>
> 你想要哪种？

**Example 2: User says "做个九宫格变体，主题是赛博朋克城市"**

> 比例确认一下：
> - 方形 (1:1) — 适合电商主图、社交媒体
> - 竖屏 (9:16) — 适合手机壁纸、小红书
> - 横屏 (16:9) — 适合海报、视频
>
> 赛博朋克城市用哪种？

**Example 3: User says "随便" or "都行"**

Pick sensible defaults and confirm briefly:

> 好，我用方形 (1:1) + 变体模式 (variation) 生成 9 张，开始？

### Mode explanation cheat sheet

When explaining modes to users:

- **solo** = 一张图
- **batch** = 多张不同内容的图（每张有独立的提示词）
- **variation** = 同一主题的多种风格变体（AI 自动创造差异）

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

1. **Clarify parameters** → If mode or ratio is ambiguous, ask the user (see "Before generating" section)
2. **Run `generate.js`** with confirmed options → Saves result JSON
3. **If user needs permanent copies** → Run `download_images.js` before URLs expire
4. **If user needs a shareable preview** → Run `build_preview.js`
