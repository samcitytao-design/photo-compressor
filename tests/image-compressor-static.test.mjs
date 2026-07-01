import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const root = "/Users/shareit/Documents/Draft";
const htmlPath = `${root}/index.html`;
const cssPath = `${root}/styles.css`;
const jsPath = `${root}/script.js`;

assert.ok(existsSync(htmlPath), "index.html should exist");
assert.ok(existsSync(cssPath), "styles.css should exist");
assert.ok(existsSync(jsPath), "script.js should exist");

const html = readFileSync(htmlPath, "utf8");
const css = readFileSync(cssPath, "utf8");
const script = readFileSync(jsPath, "utf8");

for (const snippet of [
  "<title>图像压缩工具</title>",
  'id="uploadArea"',
  'id="fileInput"',
  'id="formatSelect"',
  'id="qualityRange"',
  'id="scaleRange"',
  'id="originalPreview"',
  'id="compressedPreview"',
  'id="batchList"',
  'id="downloadSelected"',
  'id="downloadAll"',
  'id="fullscreenPreview"',
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
]) {
  assert.ok(html.includes(snippet), `HTML missing required snippet: ${snippet}`);
}

for (const snippet of [
  ".app-shell",
  ".upload-zone",
  ".workspace",
  ".preview-grid",
  ".settings-panel",
  ".batch-list",
  "@media (max-width: 760px)",
]) {
  assert.ok(css.includes(snippet), `CSS missing required snippet: ${snippet}`);
}

for (const snippet of [
  "createImageBitmap",
  "canvas.toBlob",
  "new JSZip",
  "downloadSelected",
  "downloadAll",
  "preserveOriginalName",
  "ImageCompressorUtils",
]) {
  assert.ok(script.includes(snippet), `Script missing required snippet: ${snippet}`);
}

const sandbox = {
  window: {},
  document: {
    addEventListener() {},
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
  },
  URL: {},
  console,
};

vm.runInNewContext(script, sandbox, { filename: "script.js" });

const utils = sandbox.window.ImageCompressorUtils;
assert.ok(utils, "ImageCompressorUtils should be exposed on window");
assert.equal(utils.formatBytes(512), "512 B");
assert.equal(utils.formatBytes(1536), "1.5 KB");
assert.equal(utils.formatBytes(2 * 1024 * 1024), "2.0 MB");
assert.equal(utils.mimeForFormat("webp"), "image/webp");
assert.equal(utils.mimeForFormat("jpeg"), "image/jpeg");
assert.equal(utils.mimeForFormat("png"), "image/png");
assert.equal(utils.compressionRatio(1000, 400), 60);
assert.equal(utils.compressionRatio(1000, 1200), -20);
assert.equal(
  utils.buildOutputName({
    originalName: "photo.large.png",
    index: 2,
    format: "webp",
  }),
  "photo.large.webp",
);
assert.equal(
  utils.buildOutputName({
    originalName: "banner",
    index: 0,
    format: "jpeg",
  }),
  "banner.jpeg",
);
assert.equal(
  utils.buildOutputName({
    originalName: "  .png",
    index: 4,
    format: "png",
  }),
  "image-5.png",
);
