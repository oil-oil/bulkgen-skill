#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function usage() {
  console.error("Usage: node build_preview.js <input.json> [output.html]");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizePrompt(prompts, index) {
  if (!Array.isArray(prompts)) return "";
  const value = prompts[index];
  return typeof value === "string" ? value : "";
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

function buildGridItems(images) {
  return images
    .map(
      (image, index) => `
        <article class="cell">
          <div class="cell-image">
            <img src="${escapeHtml(image.url)}" alt="Generated image ${index + 1}" loading="lazy" />
          </div>
          <div class="cell-footer">
            <span class="cell-index">#${index + 1}</span>
            <a class="download-link" href="${escapeHtml(image.url)}" download>Download</a>
          </div>
        </article>`,
    )
    .join("\n");
}

function buildOriginalGridSection(gridUrl) {
  if (!gridUrl) return "";
  return `
      <section class="original-panel">
        <p class="panel-title">Original grid (uncropped)</p>
        <img class="original-img" src="${escapeHtml(gridUrl)}" alt="Original grid image" loading="lazy" />
      </section>`;
}

function buildPromptsSection(images, prompts) {
  if (!Array.isArray(prompts) || prompts.length === 0) return "";
  const items = images
    .map((_, index) => {
      const prompt = normalizePrompt(prompts, index);
      if (!prompt) return "";
      return `
          <div class="prompt-item">
            <span class="prompt-num">#${index + 1}</span>
            <span class="prompt-text">${escapeHtml(prompt)}</span>
          </div>`;
    })
    .filter(Boolean)
    .join("\n");
  if (!items) return "";
  return `
      <section class="prompts-panel">
        <p class="panel-title">Prompts</p>
        <div class="prompt-list">${items}
        </div>
      </section>`;
}

function replaceAll(template, replacements) {
  return Object.entries(replacements).reduce(
    (output, [key, value]) => output.replace(new RegExp(`{{${key}}}`, "g"), value),
    template,
  );
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || path.resolve(process.cwd(), "bulkgen-preview.html");

  if (!inputPath) {
    usage();
    process.exit(1);
  }

  const input = readJson(path.resolve(process.cwd(), inputPath));
  const images = Array.isArray(input.images) ? input.images.map(normalizeImage) : [];

  if (images.length === 0) {
    throw new Error("Input JSON must include a non-empty images array.");
  }

  const cols = Number.isInteger(input.cols) && input.cols > 0 ? input.cols : Math.min(images.length, 4);
  const rows = Number.isInteger(input.rows) && input.rows > 0 ? input.rows : Math.ceil(images.length / cols);
  const resolution = typeof input.resolution === "string" && input.resolution ? input.resolution : "1K";
  const mode = typeof input.mode === "string" && input.mode ? input.mode : "batch";
  const title = typeof input.title === "string" && input.title ? input.title : `BulkGen ${cols}×${rows} Preview`;
  const subtitle = typeof input.subtitle === "string" && input.subtitle
    ? input.subtitle
    : "A lightweight preview page for this BulkGen generation, with a grid overview and per-image downloads.";
  const aspectRatio = typeof input.aspectRatio === "string" && /^\d+(\.\d+)?:\d+(\.\d+)?$/.test(input.aspectRatio)
    ? input.aspectRatio.replace(":", " / ")
    : "1 / 1";
  const templatePath = path.join(__dirname, "..", "assets", "html-preview-template", "template.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const gridUrl = typeof input.gridUrl === "string" && input.gridUrl ? input.gridUrl : "";

  const html = replaceAll(template, {
    TITLE: escapeHtml(title),
    SUBTITLE: escapeHtml(subtitle),
    MODE: escapeHtml(mode),
    COLS: String(cols),
    ROWS: String(rows),
    IMAGE_COUNT: String(images.length),
    RESOLUTION: escapeHtml(resolution),
    ASPECT_RATIO: aspectRatio,
    GRID_ITEMS: buildGridItems(images),
    ORIGINAL_GRID_SECTION: buildOriginalGridSection(gridUrl),
    PROMPTS_SECTION: buildPromptsSection(images, input.prompts),
  });

  fs.writeFileSync(outputPath, html);
  console.log(`Wrote ${outputPath}`);
}

main();
