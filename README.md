# BulkGen Skill

生成单图、批量图片、宫格变体和参考图编辑结果，并整理为可预览、下载的图片集合。

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
5. 按文末配置说明打开本机页面；保存后通过 run 包装生成命令，不要粘贴到 Agent 对话。

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

## API Key 配置页面

首次使用外部服务时，可以在本机配置页亲自填写 Key；已有配置会复用，密钥存入系统凭据库。只为实际使用的外部服务配置；纯本地处理不需要 Key。页面需要 Node.js 22.18+ 与可用的系统凭据服务，业务运行仍使用原依赖。

安装、状态检查、打开页面和带凭据运行的完整入口见[配置说明](bulkgen/references/api-key-setup.md)。页面保存与业务读取已经接通；不把 Key 发进聊天，也不自动迁移旧文件。
