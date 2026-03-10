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

Generate AI images with BulkGen. Scripts are bundled with this skill at `~/.claude/skills/bulkgen/scripts/` — always use this full path when running them.

## Setup

```bash
export BULKGEN_API_KEY="sk_live_your_key_here"
```

If missing, tell user to get one at https://bulk-gen.com → user menu → API Keys.

---

## Workflow

1. **Clarify** → If ambiguous, ask ratio + mode (see below)
2. **Generate** → Run `generate.js`, outputs `bulkgen-result.json`
3. **Preview** → Always run `build_preview.js` and `open` the HTML file so the user can see results immediately

---

## Before generating: clarify parameters

When the user asks for multiple images but hasn't specified ratio or mode, ask before generating.

**Ask when**: User asks for N images (e.g. "generate 9 images", "生成 9 张图") without specifying ratio or mode.

**Skip asking when**: Single image (solo), or user already specified all parameters.

**When asking, explain the options**:

> 我准备生成 9 张图片，有两个参数需要确认：
>
> 1. **比例**：方形(1:1)、竖屏(9:16)、横屏(16:9) — 默认方形
> 2. **模式**：变体(同一主题多风格) vs 批量(不同提示词各自独立) — 默认变体
>
> 你想要哪种？

If user says "随便", "都行", or "up to you" → use defaults (1:1 + variation), confirm briefly.

---

## Quick start

```bash
SCRIPTS=~/.claude/skills/bulkgen/scripts

# Single image
node $SCRIPTS/generate.js --prompts "a sunset" --mode solo

# 3x3 variations (same prompt, different styles)
node $SCRIPTS/generate.js --prompts "cyberpunk city" --mode variation --cols 3 --rows 3 --canvas-ratio 4:5

# 2x2 batch (different prompts per cell)
node $SCRIPTS/generate.js --prompts "cat" "dog" "bird" "fish" --cols 2 --rows 2

# Edit with reference image
node $SCRIPTS/generate.js --prompts "watercolor style" --input ./photo.jpg

# Build preview and open immediately (always do this after generating)
node $SCRIPTS/build_preview.js ./bulkgen-result.json ./bulkgen-preview.html && open ./bulkgen-preview.html
```

---

## Options

| Option | Values | Default |
|--------|--------|---------|
| `--mode` | solo, batch, variation | variation |
| `--cols`, `--rows` | Grid dimensions | auto |
| `--canvas-ratio` | 1:1, 16:9, 9:16, 4:5, 3:4, 3:2, 2:3, 4:3, 5:4, 21:9 | 1:1 |
| `--resolution` | 1K, 2K, 4K | 1K |
| `--input` | Reference image path | none |

---

## Modes

| Mode | Use when |
|------|----------|
| `solo` | Single image |
| `variation` | One prompt → multiple creative variants (same subject, different styles) |
| `batch` | Different prompts → each cell gets its own independent scene |

---

## Layouts

Valid: `1x1, 2x1, 1x2, 3x1, 1x3, 2x2, 3x2, 2x3, 4x2, 2x4, 3x3, 4x3, 3x4, 4x4`

Note: `--canvas-ratio` is the aspect ratio of the **full grid**, not a single cell. For 3x3 with ratio 1:1, each cell is square.

Some layout/ratio combinations are unsupported — the script will error and suggest alternatives.

---

## Reference images

Use `--input` for style transfer or editing. Up to 14 images, 7 MB each. Formats: PNG, JPG, WebP, HEIC, HEIF.

---

## Post-generation

`generate.js` saves results to `bulkgen-result.json`. Image URLs expire in 12 hours — always build the preview immediately so the user can view and download while URLs are still valid.

```bash
SCRIPTS=~/.claude/skills/bulkgen/scripts

# Build HTML preview (default: always run this)
node $SCRIPTS/build_preview.js ./bulkgen-result.json ./bulkgen-preview.html && open ./bulkgen-preview.html

# Download permanent local copies (only if user explicitly asks)
node $SCRIPTS/download_images.js ./bulkgen-result.json ./downloads
```

---

## Errors

| Status | Action |
|--------|--------|
| 401 | Invalid key → get new one at bulk-gen.com |
| 402 | Insufficient credits → top up |
| 400 | Invalid params → check layout/ratio compatibility |
| 500 | Server error → retry |
