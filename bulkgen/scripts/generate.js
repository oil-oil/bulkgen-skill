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

const MAX_SOURCE_RATIO_ERROR = 0.12;
const ASPECT_EPSILON = 0.0001;
const SUPPORTED_ASPECT_VALUES = SUPPORTED_RATIOS.map(ratioToNumber);
const MIN_SUPPORTED_TILE_ASPECT = Math.min(...SUPPORTED_ASPECT_VALUES);
const MAX_SUPPORTED_TILE_ASPECT = Math.max(...SUPPORTED_ASPECT_VALUES);

function usage() {
  console.log(`
BulkGen API Client - Generate AI images

USAGE
  node generate.js [options]

OPTIONS
  --prompts <text>       One or more prompts (required, can repeat)
  --mode <type>          solo | batch | variation (default: batch)
  --cols <n>             Grid columns (default: auto)
  --rows <n>             Grid rows (default: auto)
  --resolution <level>   1K | 2K | 4K (default: 1K)
  --canvas-ratio <ratio> Full output canvas aspect ratio (default: 1:1)
  --source-ratio <ratio> Optional source aspect ratio override
  --input <path>         Reference image(s) for editing (can repeat)
  --output <path>        Output JSON file path (default: ./bulkgen-result.json)
  --api-key <key>        API key (or set BULKGEN_API_KEY env var)
  --help                 Show this help

MODES
  solo       One prompt → one image (1x1 only)
  batch      Multiple prompts → multiple distinct images
  variation  One prompt → multiple creative variants

EXAMPLES
  # Single image
  node generate.js --prompts "a sunset over mountains" --mode solo

  # 2x2 batch on a square canvas
  node generate.js --prompts "cat" "dog" "bird" "fish" --cols 2 --rows 2 --canvas-ratio 1:1

  # 3x3 variations on a portrait canvas
  node generate.js --prompts "cyberpunk city" --mode variation --cols 3 --rows 3 --canvas-ratio 4:5

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
    canvasRatio: null,
    sourceRatio: null,
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

    if (arg === "--canvas-ratio") {
      result.canvasRatio = args[++i];
      continue;
    }

    if (arg === "--source-ratio") {
      result.sourceRatio = args[++i];
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
    errors.push("At least one --prompts value is required.");
  }

  if (!["solo", "batch", "variation"].includes(params.mode)) {
    errors.push(`Invalid mode "${params.mode}". Use: solo, batch, or variation.`);
  }

  if (params.canvasRatio && !SUPPORTED_RATIOS.includes(params.canvasRatio)) {
    errors.push(`Invalid canvas-ratio "${params.canvasRatio}". Supported: ${SUPPORTED_RATIOS.join(", ")}`);
  }

  if (params.sourceRatio && !SUPPORTED_RATIOS.includes(params.sourceRatio)) {
    errors.push(`Invalid source-ratio "${params.sourceRatio}". Supported: ${SUPPORTED_RATIOS.join(", ")}`);
  }

  if (!["1K", "2K", "4K"].includes(params.resolution)) {
    errors.push(`Invalid resolution "${params.resolution}". Use: 1K, 2K, or 4K.`);
  }

  let cols = params.cols;
  let rows = params.rows;
  const requestedCanvasRatio = params.canvasRatio || "1:1";

  if (params.mode === "solo") {
    cols = 1;
    rows = 1;
  } else if (!cols || !rows) {
    const desiredCount = params.mode === "variation" ? 4 : params.prompts.length;
    [cols, rows] = findBestLayout(desiredCount, requestedCanvasRatio);
  }

  const cellCount = cols * rows;
  const validLayout = VALID_LAYOUTS[cellCount]?.some(([c, r]) => c === cols && r === rows);

  if (!validLayout) {
    const options = Object.entries(VALID_LAYOUTS)
      .map(([, layouts]) => layouts.map(([c, r]) => `${c}x${r}`).join(", "))
      .join("; ");
    errors.push(`Invalid layout ${cols}x${rows}. Valid options: ${options}`);
  }

  if (params.mode === "solo" && cellCount !== 1) {
    errors.push("Solo mode requires a 1x1 layout.");
  }

  if (params.mode !== "solo" && cellCount < 2) {
    errors.push("Batch and variation modes require at least 2 cells.");
  }

  const suggestedSourceRatio = resolveSourceRatioForLayout(cols, rows, requestedCanvasRatio);

  if (!suggestedSourceRatio) {
    errors.push(`Layout ${cols}x${rows} does not support canvas-ratio "${requestedCanvasRatio}".`);
  } else if (params.sourceRatio && !isValidRatioLayoutCombo(cols, rows, requestedCanvasRatio, params.sourceRatio)) {
    errors.push(
      `source-ratio "${params.sourceRatio}" is not compatible with layout ${cols}x${rows} and canvas-ratio "${requestedCanvasRatio}". Try --source-ratio ${suggestedSourceRatio}.`
    );
  }

  return {
    cols,
    rows,
    canvasRatio: requestedCanvasRatio,
    sourceRatio: params.sourceRatio || suggestedSourceRatio,
    tileRatio: getTileRatioForCanvasLayout(cols, rows, requestedCanvasRatio),
    errors,
  };
}

function findBestLayout(count, canvasRatio) {
  const cellCounts = Object.keys(VALID_LAYOUTS)
    .map((value) => parseInt(value, 10))
    .sort((left, right) => left - right);

  for (const cellCount of cellCounts) {
    if (cellCount < count) continue;
    const layouts = getSortedLayoutCandidates(VALID_LAYOUTS[cellCount], canvasRatio);
    const valid = layouts.find((candidate) => isValidLayoutCandidate(candidate));
    if (valid) {
      return [valid.cols, valid.rows];
    }
    if (layouts[0]) {
      return [layouts[0].cols, layouts[0].rows];
    }
  }

  return [4, 4];
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

function getAspectOrientation(aspect) {
  if (Math.abs(aspect - 1) < ASPECT_EPSILON) return "square";
  return aspect > 1 ? "landscape" : "portrait";
}

function isTileOrientationCompatible(canvasAspect, tileAspect) {
  const canvasOrientation = getAspectOrientation(canvasAspect);
  if (canvasOrientation === "square") return true;
  return getAspectOrientation(tileAspect) === canvasOrientation;
}

function isTileAspectWithinSupportedRange(tileAspect) {
  return tileAspect >= MIN_SUPPORTED_TILE_ASPECT - ASPECT_EPSILON && tileAspect <= MAX_SUPPORTED_TILE_ASPECT + ASPECT_EPSILON;
}

function getClosestModelRatio(aspect) {
  return SUPPORTED_RATIOS.reduce((best, current) => {
    const bestDelta = Math.abs(ratioToNumber(best) - aspect);
    const currentDelta = Math.abs(ratioToNumber(current) - aspect);
    return currentDelta < bestDelta ? current : best;
  });
}

function buildLayoutCandidate(cols, rows, canvasRatio, sourceRatio) {
  const canvasAspect = ratioToNumber(canvasRatio);
  const tileAspect = (canvasAspect * rows) / cols;
  const resolvedSourceRatio = sourceRatio || getClosestModelRatio(canvasAspect);
  const sourceAspect = ratioToNumber(resolvedSourceRatio);

  return {
    cols,
    rows,
    sourceRatio: resolvedSourceRatio,
    canvasAspect,
    tileAspect,
    sourceAspectError: Math.abs(sourceAspect - canvasAspect) / canvasAspect,
    tileWithinSupportedRange: isTileAspectWithinSupportedRange(tileAspect),
    tileOrientationCompatible: isTileOrientationCompatible(canvasAspect, tileAspect),
  };
}

function isValidLayoutCandidate(candidate) {
  return (
    candidate.sourceAspectError <= MAX_SOURCE_RATIO_ERROR &&
    candidate.tileWithinSupportedRange &&
    candidate.tileOrientationCompatible
  );
}

function getCandidateScore(candidate) {
  const orientationPenalty = candidate.tileOrientationCompatible ? 0 : 100;
  const rangePenalty = candidate.tileWithinSupportedRange
    ? 0
    : candidate.tileAspect < MIN_SUPPORTED_TILE_ASPECT
      ? MIN_SUPPORTED_TILE_ASPECT - candidate.tileAspect
      : candidate.tileAspect - MAX_SUPPORTED_TILE_ASPECT;

  return orientationPenalty + rangePenalty + candidate.sourceAspectError;
}

function getSortedLayoutCandidates(layouts, canvasRatio) {
  return layouts
    .map(([cols, rows]) => buildLayoutCandidate(cols, rows, canvasRatio))
    .sort((left, right) => getCandidateScore(left) - getCandidateScore(right));
}

function resolveSourceRatioForLayout(cols, rows, canvasRatio) {
  const candidate = buildLayoutCandidate(cols, rows, canvasRatio);
  return isValidLayoutCandidate(candidate) ? candidate.sourceRatio : null;
}

function isValidRatioLayoutCombo(cols, rows, canvasRatio, sourceRatio) {
  return isValidLayoutCandidate(buildLayoutCandidate(cols, rows, canvasRatio, sourceRatio));
}

function getTileAspectForCanvasLayout(cols, rows, canvasRatio) {
  return (ratioToNumber(canvasRatio) * rows) / cols;
}

function aspectToRatioString(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) return "1:1";

  const scale = 1000;
  let width = Math.max(1, Math.round(aspect * scale));
  let height = scale;
  const gcd = (left, right) => (right === 0 ? left : gcd(right, left % right));
  const divisor = gcd(width, height);
  width /= divisor;
  height /= divisor;
  return `${width}:${height}`;
}

function getTileRatioForCanvasLayout(cols, rows, canvasRatio) {
  return aspectToRatioString(getTileAspectForCanvasLayout(cols, rows, canvasRatio));
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

async function callAPI(params, prepared) {
  const apiKey = params.apiKey || process.env.BULKGEN_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing API key. Set BULKGEN_API_KEY environment variable or use --api-key option.\n" +
        "Get your key at https://bulk-gen.com (user menu → API Keys)"
    );
  }

  const inputImagePayloads = params.inputImages.map(encodeImage);

  const requestBody = {
    mode: params.mode,
    cols: prepared.cols,
    rows: prepared.rows,
    prompts: params.prompts,
    resolution: params.resolution,
    canvasRatio: prepared.canvasRatio,
  };

  if (prepared.sourceRatio) {
    requestBody.sourceRatio = prepared.sourceRatio;
  }

  if (inputImagePayloads.length > 0) {
    requestBody.inputImages = inputImagePayloads;
  }

  console.error(
    `Calling BulkGen API (${params.mode}, ${prepared.cols}x${prepared.rows}, canvas ${prepared.canvasRatio}, ${params.resolution})...`
  );

  const response = await fetch("https://api.bulk-gen.com/api/v1/generate", {
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
      throw new Error("Invalid API key. Get a new key at https://bulk-gen.com");
    }

    if (response.status === 402) {
      const credits = result.credits || {};
      throw new Error(
        `Insufficient credits. Remaining: ${credits.remaining || 0}, Required: ${credits.required || "?"}. Top up at https://bulk-gen.com`
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
  const prepared = validateParams(params);

  if (prepared.errors.length > 0) {
    console.error("Errors:\n" + prepared.errors.map((error) => `  - ${error}`).join("\n"));
    process.exit(1);
  }

  try {
    const result = await callAPI(params, prepared);
    const output = {
      ...result,
      mode: params.mode,
      cols: prepared.cols,
      rows: prepared.rows,
      resolution: params.resolution,
      aspectRatio: prepared.canvasRatio,
      canvasRatio: result.canvasRatio || prepared.canvasRatio,
      sourceRatio: result.sourceRatio || prepared.sourceRatio,
      tileRatio: result.tileRatio || prepared.tileRatio,
      prompts: params.prompts,
    };

    fs.writeFileSync(params.outputPath, JSON.stringify(output, null, 2));

    console.error(`\nGenerated ${result.images.length} image(s)`);
    console.error(`Canvas ratio: ${output.canvasRatio}`);
    console.error(`Tile ratio: ${output.tileRatio}`);
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
