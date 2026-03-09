#!/usr/bin/env node
/**
 * BulkGen API client - generate AI images via command line
 *
 * Usage:
 *   node generate.js --prompts "prompt1" "prompt2" --mode batch --cols 2 --rows 2
 *   node generate.js --prompts "style transfer prompt" --input ./image.png
 *   node generate.js --help
 */

const fs = require("fs");
const path = require("path");

const SUPPORTED_MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

const SUPPORTED_RATIOS = ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "4:5", "5:4", "21:9"];

const VALID_LAYOUTS = {
  1: [[1, 1]],
  2: [[2, 1], [1, 2]],
  3: [[3, 1], [1, 3]],
  4: [[2, 2]],
  6: [[3, 2], [2, 3]],
  8: [[4, 2], [2, 4]],
  9: [[3, 3]],
  12: [[4, 3], [3, 4]],
  16: [[4, 4]],
};
const MAX_LAYOUT_RATIO_ERROR = 0.12;

function usage() {
  console.log(`
BulkGen API Client - Generate AI images

USAGE
  node generate.js [options]

OPTIONS
  --prompts <text>      One or more prompts (required, can repeat)
  --mode <type>         solo | batch | variation (default: batch)
  --cols <n>            Grid columns (default: auto)
  --rows <n>            Grid rows (default: auto)
  --resolution <level>  1K | 2K | 4K (default: 1K)
  --source-ratio <ratio> Source aspect ratio (optional, auto-picked when omitted)
  --output-ratio <ratio> Output tile aspect ratio (default: 1:1)
  --input <path>        Reference image(s) for editing (can repeat)
  --output <path>       Output JSON file path (default: ./bulkgen-result.json)
  --api-key <key>       API key (or set BULKGEN_API_KEY env var)
  --help                Show this help

MODES
  solo      One prompt → one image (1x1 only)
  batch     Multiple prompts → multiple distinct images
  variation One prompt → multiple creative variants

EXAMPLES
  # Single image
  node generate.js --prompts "a sunset over mountains"

  # 2x2 batch
  node generate.js --prompts "cat" "dog" "bird" "fish" --cols 2 --rows 2

  # 3x3 variations
  node generate.js --prompts "cyberpunk city" --mode variation --cols 3 --rows 3

  # Edit image with reference
  node generate.js --prompts "make it watercolor style" --input ./photo.jpg

  # High resolution
  node generate.js --prompts "product shot" --resolution 4K
`);
}

function parseArgs(args) {
  const result = {
    prompts: [],
    mode: "batch",
    cols: null,
    rows: null,
    resolution: "1K",
    sourceRatio: null,
    outputRatio: null,
    inputImages: [],
    outputPath: "./bulkgen-result.json",
    apiKey: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }

    if (arg === "--prompts" || arg === "--prompt") {
      while (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        result.prompts.push(args[++i]);
      }
      continue;
    }

    if (arg === "--mode") {
      result.mode = args[++i];
      continue;
    }

    if (arg === "--cols") {
      result.cols = parseInt(args[++i], 10);
      continue;
    }

    if (arg === "--rows") {
      result.rows = parseInt(args[++i], 10);
      continue;
    }

    if (arg === "--resolution") {
      result.resolution = args[++i];
      continue;
    }

    if (arg === "--source-ratio") {
      result.sourceRatio = args[++i];
      continue;
    }

    if (arg === "--output-ratio") {
      result.outputRatio = args[++i];
      continue;
    }

    if (arg === "--input" || arg === "--input-image") {
      result.inputImages.push(args[++i]);
      continue;
    }

    if (arg === "--output" || arg === "-o") {
      result.outputPath = args[++i];
      continue;
    }

    if (arg === "--api-key") {
      result.apiKey = args[++i];
      continue;
    }
  }

  return result;
}

function validateParams(params) {
  const errors = [];

  if (params.prompts.length === 0) {
    errors.push("At least one --prompts is required.");
  }

  if (!["solo", "batch", "variation"].includes(params.mode)) {
    errors.push(`Invalid mode "${params.mode}". Use: solo, batch, or variation.`);
  }

  if (params.sourceRatio && !SUPPORTED_RATIOS.includes(params.sourceRatio)) {
    errors.push(`Invalid source-ratio "${params.sourceRatio}". Supported: ${SUPPORTED_RATIOS.join(", ")}`);
  }

  if (params.outputRatio && !SUPPORTED_RATIOS.includes(params.outputRatio)) {
    errors.push(`Invalid output-ratio "${params.outputRatio}". Supported: ${SUPPORTED_RATIOS.join(", ")}`);
  }

  if (!["1K", "2K", "4K"].includes(params.resolution)) {
    errors.push(`Invalid resolution "${params.resolution}". Use: 1K, 2K, or 4K.`);
  }

  // Determine cols/rows
  let cols = params.cols;
  let rows = params.rows;

  if (params.mode === "solo") {
    cols = 1;
    rows = 1;
  } else if (!cols || !rows) {
    // Auto-determine based on prompt count
    const count = params.mode === "variation" ? 4 : params.prompts.length;
    const layout = findBestLayout(count);
    cols = layout[0];
    rows = layout[1];
  }

  // Validate layout
  const cellCount = cols * rows;
  const validLayout = VALID_LAYOUTS[cellCount]?.some(([c, r]) => c === cols && r === rows);

  if (!validLayout) {
    const options = Object.entries(VALID_LAYOUTS)
      .map(([n, layouts]) => layouts.map(([c, r]) => `${c}x${r}`).join(", "))
      .join("; ");
    errors.push(`Invalid layout ${cols}x${rows}. Valid options: ${options}`);
  }

  if (params.mode === "solo" && cellCount !== 1) {
    errors.push("Solo mode requires 1x1 layout.");
  }

  if (params.mode !== "solo" && cellCount < 2) {
    errors.push("Batch and variation modes require at least 2 cells.");
  }

  const outputRatio = params.outputRatio || params.sourceRatio || "1:1";
  const suggestedSourceRatio = resolveSourceRatioForLayout(cols, rows, outputRatio);

  if (!suggestedSourceRatio) {
    errors.push(`Layout ${cols}x${rows} does not support output-ratio "${outputRatio}".`);
  } else if (params.sourceRatio && !isValidRatioLayoutCombo(cols, rows, outputRatio, params.sourceRatio)) {
    errors.push(
      `source-ratio "${params.sourceRatio}" is not compatible with layout ${cols}x${rows} and output-ratio "${outputRatio}". Try --source-ratio ${suggestedSourceRatio}.`
    );
  }

  return { cols, rows, errors };
}

function findBestLayout(count) {
  // Find the smallest valid layout that fits the count
  for (const [n, layouts] of Object.entries(VALID_LAYOUTS)) {
    if (parseInt(n) >= count) {
      return layouts[0];
    }
  }
  return [4, 4]; // Fallback to 4x4
}

function ratioToNumber(ratio) {
  const [widthRaw, heightRaw] = ratio.split(":");
  const width = Number(widthRaw);
  const height = Number(heightRaw);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 1;
  }

  return width / height;
}

function getLayoutCandidates(cols, rows, outputRatio) {
  const canvasAspect = (cols / rows) * ratioToNumber(outputRatio);

  return SUPPORTED_RATIOS.map((sourceRatio) => {
    const sourceAspect = ratioToNumber(sourceRatio);
    const relativeError = Math.abs(sourceAspect - canvasAspect) / canvasAspect;
    return { sourceRatio, relativeError };
  }).sort((left, right) => left.relativeError - right.relativeError);
}

function resolveSourceRatioForLayout(cols, rows, outputRatio) {
  const candidate = getLayoutCandidates(cols, rows, outputRatio)[0];
  return candidate && candidate.relativeError <= MAX_LAYOUT_RATIO_ERROR ? candidate.sourceRatio : null;
}

function isValidRatioLayoutCombo(cols, rows, outputRatio, sourceRatio) {
  return getLayoutCandidates(cols, rows, outputRatio).some(
    (candidate) => candidate.sourceRatio === sourceRatio && candidate.relativeError <= MAX_LAYOUT_RATIO_ERROR
  );
}


function encodeImage(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Input image not found: ${filePath}`);
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const mimeType = SUPPORTED_MIME_TYPES[ext];

  if (!mimeType) {
    throw new Error(`Unsupported image format: ${ext}. Supported: ${Object.keys(SUPPORTED_MIME_TYPES).join(", ")}`);
  }

  const stats = fs.statSync(absolutePath);
  const sizeMB = stats.size / (1024 * 1024);

  if (sizeMB > 7) {
    throw new Error(`Image too large: ${filePath} (${sizeMB.toFixed(1)} MB). Limit: 7 MB.`);
  }

  const buffer = fs.readFileSync(absolutePath);
  const base64 = buffer.toString("base64");

  return { mimeType, dataBase64: base64 };
}

async function callAPI(params, cols, rows) {
  const apiKey = params.apiKey || process.env.BULKGEN_API_KEY;
  const outputRatio = params.outputRatio || params.sourceRatio || "1:1";
  const sourceRatio = params.sourceRatio || resolveSourceRatioForLayout(cols, rows, outputRatio);

  if (!apiKey) {
    throw new Error(
      "Missing API key. Set BULKGEN_API_KEY environment variable or use --api-key option.\n" +
        "Get your key at https://bulk-gen.com (user menu → API Keys)"
    );
  }

  const inputImagePayloads = params.inputImages.map(encodeImage);

  const requestBody = {
    mode: params.mode,
    cols,
    rows,
    prompts: params.prompts,
    resolution: params.resolution,
    outputRatio,
  };

  if (sourceRatio) {
    requestBody.sourceRatio = sourceRatio;
  }

  if (inputImagePayloads.length > 0) {
    requestBody.inputImages = inputImagePayloads;
  }

  console.error(`Calling BulkGen API (${params.mode}, ${cols}x${rows}, ${params.resolution})...`);

  const response = await fetch("https://bulk-gen.com/api/v1/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMessage = result.error || `API error: ${response.status}`;

    if (response.status === 401) {
      throw new Error(`Invalid API key. Get a new key at https://bulk-gen.com`);
    }

    if (response.status === 402) {
      const credits = result.credits || {};
      throw new Error(
        `Insufficient credits. Remaining: ${credits.remaining || 0}, Required: ${credits.required || "?"}. ` +
          `Top up at https://bulk-gen.com`
      );
    }

    throw new Error(errorMessage);
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    usage();
    process.exit(1);
  }

  const params = parseArgs(args);
  const { cols, rows, errors } = validateParams(params);

  if (errors.length > 0) {
    console.error("Errors:\n" + errors.map((e) => `  - ${e}`).join("\n"));
    process.exit(1);
  }

  try {
    const result = await callAPI(params, cols, rows);

    // Add metadata for preview generation
    const output = {
      ...result,
      mode: params.mode,
      cols,
      rows,
      resolution: params.resolution,
      aspectRatio: params.outputRatio || params.sourceRatio || "1:1",
      sourceRatio: result.sourceRatio || params.sourceRatio || resolveSourceRatioForLayout(cols, rows, params.outputRatio || params.sourceRatio || "1:1"),
      prompts: params.prompts,
    };

    fs.writeFileSync(params.outputPath, JSON.stringify(output, null, 2));

    console.error(`\nGenerated ${result.images.length} image(s)`);
    console.error(`Credits charged: ${result.credits?.charged || "?"}`);
    console.error(`Credits remaining: ${result.credits?.remaining ?? "?"}`);
    console.error(`\nResult saved to: ${params.outputPath}`);
    console.error(`\nImage URLs:`);
    result.images.forEach((img, i) => {
      console.error(`  ${i + 1}. ${img.url}`);
    });
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

main();
