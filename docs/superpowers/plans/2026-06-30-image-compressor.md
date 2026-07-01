# Image Compressor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a refined static browser-only image compressor that matches the original site's core behavior and improves layout, clarity, and mobile usability.

**Architecture:** The app is a static single-page tool with `index.html`, `styles.css`, and `script.js`. Browser APIs handle file reading, image decoding, Canvas compression, previews, state updates, and downloads; JSZip handles batch ZIP creation.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Canvas API, FileReader, Blob/Object URLs, JSZip CDN, Node assertion tests.

---

## File Structure

- Create: `/Users/shareit/Documents/Draft/index.html`
  - Semantic app shell, upload zone, controls, preview panels, batch list, toast region, and fullscreen preview.
- Create: `/Users/shareit/Documents/Draft/styles.css`
  - Responsive work-focused visual design, stable fixed-format controls, upload/preview/batch states, mobile layout.
- Create: `/Users/shareit/Documents/Draft/script.js`
  - App state, utility functions, file intake, compression, preview updates, list rendering, downloads, and toast/fullscreen behavior.
- Create: `/Users/shareit/Documents/Draft/tests/image-compressor-static.test.mjs`
  - Node tests for required static markup/CSS/script contracts and exported pure utility behavior.

### Task 1: Add Failing Static Shell Test

**Files:**
- Create: `/Users/shareit/Documents/Draft/tests/image-compressor-static.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
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
  "ImageCompressorUtils",
]) {
  assert.ok(script.includes(snippet), `Script missing required snippet: ${snippet}`);
}

const sandbox = {
  window: {},
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
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
  utils.buildOutputName({ originalName: "photo.large.png", index: 2, format: "webp", custom: "样式", start: 1, pattern: "name_suffix" }),
  "样式3.webp",
);
assert.equal(
  utils.buildOutputName({ originalName: "photo.large.png", index: 2, format: "jpeg", custom: "img-", start: 10, pattern: "suffix_name" }),
  "12img-.jpeg",
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/shareit/Documents/Draft/tests/image-compressor-static.test.mjs`

Expected: FAIL because `index.html`, `styles.css`, and `script.js` do not exist yet.

### Task 2: Add Static Markup And Responsive Styles

**Files:**
- Create: `/Users/shareit/Documents/Draft/index.html`
- Create: `/Users/shareit/Documents/Draft/styles.css`

- [ ] **Step 1: Write minimal markup and styles**

Create `index.html` with the required app regions:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>图像压缩工具</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" defer></script>
  <script src="script.js" defer></script>
</head>
<body>
  <main class="app-shell">
    <header class="app-header">
      <p class="eyebrow">本地处理 · 不上传图片</p>
      <h1>图像压缩工具</h1>
      <p class="header-note">拖入图片，调整质量和尺寸，然后下载压缩结果。</p>
    </header>

    <section class="upload-zone" id="uploadArea" aria-label="上传图片">
      <input id="fileInput" type="file" accept="image/*" multiple hidden>
      <div class="upload-icon" aria-hidden="true">↑</div>
      <strong>拖拽图片到这里或点击上传</strong>
      <span>支持多张图片，处理过程只在当前浏览器中完成。</span>
    </section>

    <section class="workspace" id="workspace" hidden>
      <aside class="settings-panel" aria-label="压缩设置">
        <div class="control-group">
          <label for="formatSelect">格式</label>
          <select id="formatSelect">
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
          </select>
        </div>
        <div class="control-group">
          <label for="qualityRange">质量 <span id="qualityValue">80%</span></label>
          <input id="qualityRange" type="range" min="1" max="100" value="80">
        </div>
        <div class="control-group">
          <label for="scaleRange">缩放 <span id="scaleValue">100%</span></label>
          <input id="scaleRange" type="range" min="1" max="100" value="100">
        </div>
        <div class="control-group">
          <label for="namePattern">名称格式</label>
          <select id="namePattern">
            <option value="name_suffix">名称和索引</option>
            <option value="suffix_name">索引和名称</option>
          </select>
        </div>
        <div class="control-group">
          <label for="customPattern">自定义名称</label>
          <input id="customPattern" type="text" value="样式">
        </div>
        <div class="control-group">
          <label for="startNumber">开始数字</label>
          <input id="startNumber" type="number" min="0" value="1">
        </div>
        <p class="name-preview" id="namePreview">示例：样式1.webp</p>
        <div class="action-row">
          <button class="primary-button" id="downloadSelected" type="button">下载当前图片</button>
          <button class="secondary-button" id="downloadAll" type="button">下载全部 ZIP</button>
        </div>
      </aside>

      <section class="preview-area">
        <nav class="image-nav" aria-label="图片切换">
          <button id="prevImage" type="button" aria-label="上一张">‹</button>
          <span id="imageCounter">1 / 1</span>
          <button id="nextImage" type="button" aria-label="下一张">›</button>
        </nav>
        <div class="preview-grid">
          <article class="preview-card">
            <h2>原图</h2>
            <button class="image-button" type="button" data-preview="original">
              <img id="originalPreview" alt="原图预览">
            </button>
            <p id="originalMeta">等待图片</p>
          </article>
          <article class="preview-card">
            <h2>压缩后</h2>
            <button class="image-button" type="button" data-preview="compressed">
              <img id="compressedPreview" alt="压缩后预览">
            </button>
            <p id="compressedMeta">等待压缩</p>
          </article>
        </div>
        <section class="batch-panel">
          <div class="batch-header">
            <h2>批量处理列表</h2>
            <p id="batchStats">等待图片</p>
          </div>
          <div class="batch-list" id="batchList"></div>
        </section>
      </section>
    </section>
  </main>

  <div class="toast-region" id="toastRegion" aria-live="polite"></div>
  <div class="fullscreen-preview" id="fullscreenPreview" hidden>
    <button id="closeFullscreen" type="button" aria-label="关闭预览">×</button>
    <img id="fullscreenImage" alt="全屏图片预览">
  </div>
</body>
</html>
```

Create `styles.css` with the required classes, responsive grid, upload states, controls, preview cards, batch list, toast, and fullscreen overlay.

- [ ] **Step 2: Run test to verify remaining failure**

Run: `node /Users/shareit/Documents/Draft/tests/image-compressor-static.test.mjs`

Expected: FAIL because `script.js` does not exist or does not expose `ImageCompressorUtils`.

### Task 3: Add Tested Utilities And App Wiring

**Files:**
- Create: `/Users/shareit/Documents/Draft/script.js`

- [ ] **Step 1: Implement utilities first**

Create `script.js` with pure utilities exposed before DOM wiring:

```js
(function () {
  const utils = {
    formatBytes(bytes) {
      if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
      if (bytes < 1024) return `${Math.round(bytes)} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    },
    mimeForFormat(format) {
      return {
        webp: "image/webp",
        jpeg: "image/jpeg",
        png: "image/png",
      }[format] || "image/jpeg";
    },
    compressionRatio(originalSize, compressedSize) {
      if (!originalSize) return 0;
      return Math.round(((originalSize - compressedSize) / originalSize) * 100);
    },
    buildOutputName({ index, format, custom, start, pattern }) {
      const number = Number(start || 0) + Number(index || 0);
      const safeCustom = String(custom || "image").trim() || "image";
      return pattern === "suffix_name"
        ? `${number}${safeCustom}.${format}`
        : `${safeCustom}${number}.${format}`;
    },
  };

  window.ImageCompressorUtils = utils;

  document.addEventListener("DOMContentLoaded", () => {
    const app = createApp(utils);
    app.init();
  });

  function createApp(utils) {
    return {
      init() {
        // Full implementation is added in the next step.
      },
    };
  }
})();
```

- [ ] **Step 2: Run test to verify utility pass and behavior contracts still fail**

Run: `node /Users/shareit/Documents/Draft/tests/image-compressor-static.test.mjs`

Expected: FAIL only on script behavior snippets such as `createImageBitmap`, `canvas.toBlob`, `new JSZip`, and download handlers.

- [ ] **Step 3: Implement file intake, compression, rendering, downloads, and toasts**

Replace the `createApp` body with stateful browser logic:

- Cache DOM elements by id.
- Keep `files`, `currentIndex`, `results`, and `objectUrls` in state.
- Add click, change, dragover, dragleave, drop, range input, select, text input, number input, previous, next, download, fullscreen, and close listeners.
- On file intake, filter `image/*`, skip duplicate names, show workspace, render list, and select the first new image.
- Compress selected and batch files with `createImageBitmap(file)`, a generated `canvas`, and `canvas.toBlob()`.
- Render original/compressed previews, size metadata, dimensions, per-image ratio, aggregate ratio, and selected item state.
- Download one image by creating an object URL from its compressed blob.
- Download all images by creating `new JSZip()`, adding compressed blobs under generated names, and saving a ZIP.
- Recompute compression on format, quality, or scale changes using a short debounce.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/shareit/Documents/Draft/tests/image-compressor-static.test.mjs`

Expected: PASS.

### Task 4: Visual And Interaction Verification

**Files:**
- Verify: `/Users/shareit/Documents/Draft/index.html`
- Verify: `/Users/shareit/Documents/Draft/styles.css`
- Verify: `/Users/shareit/Documents/Draft/script.js`

- [ ] **Step 1: Start a local static server**

Run: `python3 -m http.server 4173`

Expected: server starts at `http://localhost:4173/`.

- [ ] **Step 2: Open the app in the browser**

Open: `http://localhost:4173/index.html`

Expected: upload zone and header are visible with no overlapping text.

- [ ] **Step 3: Verify responsive layout**

Check desktop and mobile widths.

Expected: desktop shows settings beside previews; mobile stacks upload, settings, previews, and list without overflow.

- [ ] **Step 4: Verify actual compression behavior**

Upload at least one generated PNG fixture.

Expected: original and compressed previews render, metadata updates, quality/scale changes recompress, and download buttons remain enabled.

- [ ] **Step 5: Run final automated verification**

Run: `node /Users/shareit/Documents/Draft/tests/image-compressor-static.test.mjs`

Expected: PASS.

### Task 5: Completion Notes

**Files:**
- Review: `/Users/shareit/Documents/Draft/docs/superpowers/specs/2026-06-30-image-compressor-design.md`
- Review: `/Users/shareit/Documents/Draft/docs/superpowers/plans/2026-06-30-image-compressor.md`

- [ ] **Step 1: Confirm spec coverage**

Check that the implementation includes upload/drop, multi-image handling, preview comparison, WebP/JPEG/PNG, quality, scale, naming, single download, ZIP download, fullscreen preview, error toasts, and responsive layout.

- [ ] **Step 2: Note repository limitation**

Because `/Users/shareit/Documents/Draft` is not a Git repository, do not run commit commands. Mention this limitation in the final summary.
