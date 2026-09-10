---
name: bulkgen
description: "生成单图、批量图片、宫格变体和参考图编辑结果，并生成 HTML 预览与下载入口。用户明确选择 bulkgen 或需要其批量宫格工作流时使用。不因普通生图请求自动替换已选工具；不用于视频、矢量绘图或屏幕操作。"
---

# BulkGen Agent Skill

通过 BulkGen 生成图片。将当前 `SKILL.md` 所在绝对目录记为 `SKILL_DIR`，脚本位于其 `scripts/` 下；产物写入任务目录。

**Language**: Always respond in the user's language. This skill is written in English for consistency, but all replies to the user should match their language.

---

## API Key 配置入口

需要外部服务凭据时先读[API Key 配置与业务读取](references/api-key-setup.md)：复用已有安全入口；本机缺少 Key 时使用随附固定页面，保存后通过业务包装入口读取。内置能力与纯本地流程不要求配置 Key。

## API Key

业务脚本只使用运行时注入的 `BULKGEN_API_KEY`。已有凭据时直接复用；缺少时按配置说明打开本机页面，由用户亲自保存。通过随附 run 入口向生成脚本注入凭据。不要让用户把密钥发到聊天，不将密钥写进命令、Skill、项目文件或日志。

无安全入口时说明缺少配置，保留已完成的本地准备。401 表示认证失败，先核对凭据状态，不自动反复提交生成任务。

---

## Workflow

1. **Clarify** → If parameters are ambiguous, ask ratio + mode before generating
2. **Generate** → Run `generate.js` using the configured runtime credential
3. **Preview** → Always run `build_preview.js` and `open` the HTML immediately after

---

## Before generating: clarify parameters

When the user asks for multiple images without specifying ratio or mode, ask before generating.

**Ask when**: User requests N images without specifying ratio or mode.

**Skip asking when**: Single image (solo mode), or all parameters already specified.

**When asking**, explain the two choices in the user's language:
- **Ratio**: square (1:1), portrait (9:16), landscape (16:9) — default square
- **Mode**: variation (one prompt, multiple styles) vs batch (different prompt per cell) — default variation

If the user says they don't mind or leaves it to you, use defaults (1:1 + variation) and confirm briefly.

---

## Quick start

```bash
SCRIPTS="$SKILL_DIR/scripts"

# Single image
node "$SCRIPTS/credential-ui/src/profile.ts" run default -- node "$SCRIPTS/generate.js" --prompts "a sunset" --mode solo

# 3x3 variations (same prompt, different styles)
node "$SCRIPTS/credential-ui/src/profile.ts" run default -- node "$SCRIPTS/generate.js" --prompts "cyberpunk city" --mode variation --cols 3 --rows 3 --canvas-ratio 1:1

# 2x2 batch (different prompts per cell)
node "$SCRIPTS/credential-ui/src/profile.ts" run default -- node "$SCRIPTS/generate.js" --prompts "cat" "dog" "bird" "fish" --cols 2 --rows 2

# Edit with reference image
node "$SCRIPTS/credential-ui/src/profile.ts" run default -- node "$SCRIPTS/generate.js" --prompts "watercolor style" --input ./photo.jpg

# Build preview and open (always do this after generating)
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

`--canvas-ratio` is the aspect ratio of the **full grid**, not a single cell. Some layout/ratio combinations are unsupported — the script will error and suggest alternatives.

---

## Reference images

Use `--input` for style transfer or editing. Up to 14 images, 7 MB each. Formats: PNG, JPG, WebP, HEIC, HEIF.

---

## Post-generation

Image URLs expire in 12 hours — always build the preview immediately.

```bash
SCRIPTS="$SKILL_DIR/scripts"

# Build HTML preview (always run this)
node $SCRIPTS/build_preview.js ./bulkgen-result.json ./bulkgen-preview.html && open ./bulkgen-preview.html

# Download permanent local copies (only if user explicitly asks)
node $SCRIPTS/download_images.js ./bulkgen-result.json ./downloads
```

---

## Errors

| Status | Action |
|--------|--------|
| 401 | Invalid key — ask user to check or get a new one at bulk-gen.com |
| 402 | Insufficient credits — ask user to top up at bulk-gen.com |
| 400 | Invalid params — check layout/ratio compatibility |
| 500 | Server error — retry once |
