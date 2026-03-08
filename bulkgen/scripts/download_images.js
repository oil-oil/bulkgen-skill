#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function usage() {
  console.error("Usage: node scripts/download_images.js <result.json> [output-dir]");
}

function ensureFetch() {
  if (typeof fetch !== "function") {
    throw new Error("This script requires Node.js 18+ with global fetch support.");
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sanitizeSegment(value, fallback) {
  const cleaned = String(value || fallback)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  return cleaned || fallback;
}

function guessExtension(image, response) {
  const filePath = typeof image.filePath === "string" ? image.filePath : "";
  const fileExt = path.extname(filePath);
  if (fileExt) return fileExt.toLowerCase();

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/jpeg")) return ".jpg";
  if (contentType.includes("image/webp")) return ".webp";
  if (contentType.includes("image/gif")) return ".gif";

  const url = typeof image.url === "string" ? image.url : "";
  try {
    const pathname = new URL(url).pathname;
    const urlExt = path.extname(pathname);
    if (urlExt) return urlExt.toLowerCase();
  } catch {}

  return ".png";
}

function normalizeImage(image, index) {
  if (!image || typeof image !== "object") {
    throw new Error(`images[${index}] must be an object.`);
  }

  if (typeof image.url !== "string" || image.url.length === 0) {
    throw new Error(`images[${index}].url is required.`);
  }

  return {
    id: typeof image.id === "string" ? image.id : `image-${index + 1}`,
    url: image.url,
    filePath: typeof image.filePath === "string" ? image.filePath : "",
    expiresAt: typeof image.expiresAt === "string" ? image.expiresAt : "",
  };
}

function buildFileName(image, index, extension) {
  const numericPrefix = String(index + 1).padStart(2, "0");
  const fromPath = image.filePath ? path.basename(image.filePath, path.extname(image.filePath)) : "";
  const stem = sanitizeSegment(fromPath || image.id, `image-${numericPrefix}`);
  return `${numericPrefix}-${stem}${extension}`;
}

async function downloadOne(image, index, outputDir) {
  const response = await fetch(image.url);
  if (!response.ok) {
    throw new Error(`Failed to download image ${index + 1}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = guessExtension(image, response);
  const fileName = buildFileName(image, index, extension);
  const outputPath = path.join(outputDir, fileName);

  fs.writeFileSync(outputPath, buffer);

  return {
    index: index + 1,
    id: image.id,
    sourceUrl: image.url,
    filePath: image.filePath,
    expiresAt: image.expiresAt,
    localPath: outputPath,
    sizeBytes: buffer.length,
  };
}

async function main() {
  ensureFetch();

  const inputArg = process.argv[2];
  const outputArg = process.argv[3] || "bulkgen-downloads";

  if (!inputArg) {
    usage();
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputDir = path.resolve(process.cwd(), outputArg);
  const payload = readJson(inputPath);
  const images = Array.isArray(payload.images) ? payload.images.map(normalizeImage) : [];

  if (images.length === 0) {
    throw new Error("Input JSON must include a non-empty images array.");
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const downloads = [];
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const item = await downloadOne(image, index, outputDir);
    downloads.push(item);
    console.log(`Downloaded ${item.localPath}`);
  }

  const manifest = {
    source: inputPath,
    downloadedAt: new Date().toISOString(),
    expiresAt: typeof payload.expiresAt === "string" ? payload.expiresAt : null,
    imageCount: downloads.length,
    items: downloads,
  };

  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Wrote ${manifestPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
