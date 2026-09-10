# BulkGen Skill

BulkGen skill for AI agents. Generate one or many AI images with a single request, edit images with reference photos, auto-resolve compatible canvas/source ratios, and optionally package the result into a lightweight HTML preview page with download buttons.

## Install

```bash
npx skills add oil-oil/bulkgen-skill
```

## Install note

The GitHub repository is `oil-oil/bulkgen-skill`, while the installed skill name remains `bulkgen` because the actual skill folder is `bulkgen/` and its frontmatter uses `name: bulkgen`.

## Setup

```bash
# 由可信运行环境配置 BULKGEN_API_KEY；不要把真实密钥写进命令历史
```

If the key is not configured yet, get it from `https://bulk-gen.com`:

1. Log in
2. Open the user menu
3. Choose `API Keys`
4. Create a new key
5. 通过宿主安全凭据入口或自己的终端会话注入 `BULKGEN_API_KEY`；不要粘贴到 Agent 对话。

## What it does

- Generate single images, grids, and variation sets
- Edit images with reference photos (style transfer, compositing)
- Auto-pick a compatible source ratio when the user only cares about the full canvas ratio
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

## 配置、依赖与使用边界

需要 Node.js、网络和 BULKGEN_API_KEY 运行时凭据；从可信环境注入，不把 Key 写进命令参数或聊天。

提示词与选定图片会发送到 BulkGen，可能计费；先明确数量与输出范围，输出按真实完成结果验收。

使用示例：

```text
用 bulkgen 按这些主题批量生成图像。
```
