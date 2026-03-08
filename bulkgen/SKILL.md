---
name: bulkgen
description: Bulk AI image generation via the BulkGen API, plus post-generation HTML preview packaging. Use when users ask to generate one or many AI images, create image grids, batch image generation, multiple variants, prompt-based image sets, or when the result should be delivered as a browsable HTML gallery with per-image download buttons. Triggers include: "generate images", "create AI art", "make a 3x3 grid", "generate variations", "批量生成图片", "生成宫格图", "给我一个可预览可下载的 HTML 页面".
---

# BulkGen Agent Skill

Generate one or many AI images with BulkGen and, when useful, package the result as a lightweight HTML preview page.

## Setup

Set `BULKGEN_API_KEY` before calling the API.

```bash
export BULKGEN_API_KEY="sk_live_your_key_here"
```

## Missing key fallback

If `BULKGEN_API_KEY` is missing, do not pretend the skill can proceed normally. Pause the API call and tell the user how to get a key:

1. Open `https://bulkgen.app`
2. Log in
3. Open the user menu in the top-right corner
4. Choose `API Keys`
5. Create a new key
6. Either:
   - export it locally as `BULKGEN_API_KEY`, or
   - paste the key directly into the chat so the agent can use it for the current task

When asking for the key, be explicit and action-oriented. Example wording:

> I can use BulkGen, but I do not see `BULKGEN_API_KEY` configured yet. Please open BulkGen → user menu → API Keys → create a key, then either export `BULKGEN_API_KEY` or paste the key here and I will continue.

If the user pastes the key directly, use it for the current task and avoid repeating the full secret back unless absolutely necessary.

## Call the API

Send a POST request to:

```text
https://bulkgen.app/api/v1/generate
```

Use these headers:

```text
Authorization: Bearer <BULKGEN_API_KEY>
Content-Type: application/json
```

Use this request shape:

```json
{
  "mode": "solo | batch | variation",
  "cols": 1,
  "rows": 1,
  "sourceRatio": "1:1",
  "outputRatio": "1:1",
  "prompts": ["your prompt here"],
  "resolution": "1K"
}
```

## Choose the right mode

- Use `solo` for one prompt → one image.
- Use `batch` for multiple prompts → multiple distinct images.
- Use `variation` for one prompt → multiple creative variants.

## Parameter rules

- `mode`: `solo`, `batch`, or `variation`. Default to `batch` if the user wants multiple distinct prompts.
- `cols` and `rows`: required positive integers describing the layout.
- `sourceRatio`: optional. Default `1:1`.
- `outputRatio`: optional. Default to the same as `sourceRatio`.
- `prompts`: required array. Include at least one non-empty prompt.
- `resolution`: optional. `1K`, `2K`, or `4K`. Default `1K`.

## Supported ratios

`1:1`, `3:2`, `2:3`, `4:3`, `3:4`, `16:9`, `9:16`, `4:5`, `5:4`, `21:9`

## Supported layouts

| Count | Layouts |
|-------|---------|
| 1 | 1x1 |
| 2 | 2x1, 1x2 |
| 3 | 3x1, 1x3 |
| 4 | 2x2 |
| 6 | 3x2, 2x3 |
| 8 | 4x2, 2x4 |
| 9 | 3x3 |
| 12 | 4x3, 3x4 |
| 16 | 4x4 |

## Response shape

```json
{
  "expiresAt": "2026-03-06T12:00:00.000Z",
  "images": [
    {
      "id": "uuid",
      "filePath": "user_id/timestamp-1-uuid.png",
      "url": "https://signed-url...",
      "expiresAt": "2026-03-06T12:00:00.000Z"
    }
  ]
}
```

Use `images[].url` for preview or download. Signed URLs expire, so download assets promptly if the user wants to keep them.

## Persist images locally before links expire

If the user wants to keep the assets, archive them, hand them off, or review them later, do not rely on signed URLs alone. Download the images to local files.

Use the bundled download script:

- Downloader: `scripts/download_images.js`

Run it like this:

```bash
node scripts/download_images.js ./result.json ./bulkgen-downloads
```

This script:

- Downloads every image in `images[]`
- Works on macOS and Windows as long as Node.js 18+ is available
- Avoids extra dependencies like Python packages or shell utilities
- Writes files into the chosen folder
- Creates a `manifest.json` with local paths, source URLs, and expiry metadata

## Build an HTML preview after generation

When the user wants a polished deliverable, create a preview page after generation.

Use the bundled template and script:

- Template: `assets/html-preview-template/template.html`
- Builder: `scripts/build_preview.js`

Prepare a JSON file that includes the generation result plus layout metadata. Example:

```json
{
  "title": "BulkGen 3x3 character concepts",
  "subtitle": "Nine fantasy explorer portraits in one preview page.",
  "mode": "batch",
  "cols": 3,
  "rows": 3,
  "resolution": "1K",
  "aspectRatio": "1:1",
  "prompts": [
    "forest ranger portrait",
    "desert scout portrait",
    "mountain hunter portrait"
  ],
  "images": [
    {
      "id": "uuid-1",
      "filePath": "user/tile-1.png",
      "url": "https://signed-url-1",
      "expiresAt": "2026-03-06T12:00:00.000Z"
    }
  ]
}
```

Generate the preview page like this:

```bash
node scripts/build_preview.js ./result.json ./bulkgen-preview.html
```

The output HTML contains:

- A grid preview matching the requested `cols × rows`
- Per-image download buttons
- An optional top-level “Download all” button when `downloadAllUrl` is provided
- A prompt list for reference

## Delivery rule

- If the user only wants a quick preview, returning signed URLs or an HTML preview is acceptable.
- If the user wants the assets saved, delivered, archived, or reused later, run the download script so the output exists locally before the URLs expire.
- If the user asks for a polished handoff, prefer both: download the images locally and generate the HTML preview page.

## Example: cURL

```bash
curl -X POST https://bulkgen.app/api/v1/generate \
  -H "Authorization: Bearer $BULKGEN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "batch",
    "cols": 2,
    "rows": 2,
    "prompts": [
      "editorial portrait in soft daylight",
      "product still life on stone surface",
      "futuristic sneaker campaign shot",
      "minimal perfume bottle advertisement"
    ],
    "resolution": "1K"
  }'
```

## Example: Python

```python
import json
import os
import requests

api_key = os.environ["BULKGEN_API_KEY"]
response = requests.post(
    "https://bulkgen.app/api/v1/generate",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    },
    json={
        "mode": "variation",
        "cols": 2,
        "rows": 2,
        "prompts": ["minimal sports car in a moody studio"],
        "resolution": "1K",
    },
    timeout=120,
)
response.raise_for_status()
result = response.json()
print(json.dumps(result, indent=2))
```

## Error handling

| Status | Meaning |
|--------|---------|
| 400 | Invalid parameters. Check prompts, mode, layout, and ratios. |
| 401 | Missing or invalid API key. |
| 500 | Server error. Retry or report the failure. |
| 502 | Upstream model generation failure. Retry with adjusted prompts if needed. |

## Cost note

BulkGen generates a grid image and splits it server-side. One request can return many final tiles while billing only one generation pass.
