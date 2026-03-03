# @linzhihuang/bulkgen-skill

BulkGen Agent Skill for Claude Code - Generate AI images efficiently with one API call for multiple outputs.

## Installation

```bash
npx skills add @linzhihuang/bulkgen-skill
```

## Setup

1. Get your API key from [BulkGen](https://bulkgen.app)
2. Set environment variable:

```bash
export BULKGEN_API_KEY="sk_live_your_key_here"
```

## Usage

Once installed, Claude will automatically use BulkGen when you request AI image generation:

- "Generate 4 product hero concepts"
- "Create a 3x3 grid of anime characters"
- "Make variations of this logo concept"

## Features

- **Solo Mode**: Single prompt → Single image
- **Batch Mode**: N prompts → N distinct images
- **Variation Mode**: 1 prompt → N creative variants

## Cost Optimization

BulkGen generates a grid image then splits it server-side. You pay for ONE image regardless of cell count.

Example: 9 images at 1K = $0.067 (not 9 × $0.067)

## Links

- [BulkGen App](https://bulkgen.app)
- [API Documentation](https://bulkgen.app → API Docs)

## License

MIT
