---
name: bulkgen
description: |
  Bulk AI image generation via BulkGen API. Use when users request AI image generation,
  batch image creation, or multiple image variants. Supports three modes:
  (1) Solo - single image from one prompt
  (2) Batch - multiple distinct images with individual prompts
  (3) Variation - multiple creative variations of one concept

  Triggers on: "generate images", "create AI art", "batch image generation",
  "multiple images at once", "image variations", "批量生成图片", "生成多张图片"
---

# BulkGen Agent Skill

Generate AI images efficiently with one API call for multiple outputs.

## Setup

### 1. Get API Key

Visit https://bulkgen.app, login, and create an API key from the user menu.

### 2. Set Environment Variable

```bash
export BULKGEN_API_KEY="sk_live_your_key_here"
```

## Usage

### Endpoint

```
POST https://bulkgen.app/api/v1/generate
Authorization: Bearer <BULKGEN_API_KEY>
Content-Type: application/json
```

### Request Body

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

## Modes

### Solo (1 image)

Single prompt, single image output.

```json
{
  "mode": "solo",
  "cols": 1,
  "rows": 1,
  "prompts": ["a serene mountain landscape at sunset"]
}
```

### Batch (2-16 images)

Each cell has its own prompt for distinct images.

```json
{
  "mode": "batch",
  "cols": 3,
  "rows": 3,
  "prompts": [
    "product shot of sneakers",
    "product shot of watch",
    "product shot of headphones"
  ]
}
```

### Variation (2-16 images)

One prompt, AI generates creative variations.

```json
{
  "mode": "variation",
  "cols": 2,
  "rows": 2,
  "prompts": ["minimalist logo for tech startup"]
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | string | No | `solo`, `batch`, or `variation`. Default: `batch` |
| `cols` | number | Yes | Grid columns (by supported layout) |
| `rows` | number | Yes | Grid rows (by supported layout) |
| `sourceRatio` | string | No | Source aspect ratio. Default: `1:1` |
| `outputRatio` | string | No | Output aspect ratio. Default: same as source |
| `prompts` | string[] | Yes | Array of prompts. At least one non-empty prompt required |
| `resolution` | string | No | `1K`, `2K`, or `4K`. Default: `1K` |

### Supported Aspect Ratios

`1:1`, `3:2`, `2:3`, `4:3`, `3:4`, `16:9`, `9:16`, `4:5`, `5:4`, `21:9`

### Supported Grid Layouts

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

## Response

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

Each image object contains a signed URL that expires after 12 hours. Download or display images using the `url` field.

## Example: Python

```python
import os
import requests

api_key = os.environ.get("BULKGEN_API_KEY")
response = requests.post(
    "https://bulkgen.app/api/v1/generate",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    },
    json={
        "mode": "batch",
        "cols": 2,
        "rows": 2,
        "prompts": [
            "cyberpunk city street",
            "fantasy forest glade",
            "underwater coral reef",
            "desert oasis at dawn"
        ],
        "resolution": "1K"
    },
    timeout=120
)

result = response.json()
for i, img in enumerate(result["images"]):
    img_data = requests.get(img["url"]).content
    with open(f"image_{i+1}.png", "wb") as f:
        f.write(img_data)
```

## Example: cURL

```bash
curl -X POST https://bulkgen.app/api/v1/generate \
  -H "Authorization: Bearer $BULKGEN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "solo",
    "cols": 1,
    "rows": 1,
    "prompts": ["a majestic eagle soaring over mountains"],
    "resolution": "1K"
  }'
```

Response:

```json
{
  "expiresAt": "...",
  "images": [{"id": "...", "filePath": "...", "url": "https://signed-url...", "expiresAt": "..."}]
}
```

## Error Handling

| Status | Error |
|--------|-------|
| 401 | Invalid or missing API key |
| 400 | Invalid parameters (check mode, layout, ratio, prompts) |
| 502 | Model failed to generate image |
| 500 | Server error |

## Cost Optimization

BulkGen generates a grid image then splits it server-side. You pay for ONE image regardless of cell count.

Example: 9 images at 1K resolution ≈ $0.067 (not 9 × $0.067)
