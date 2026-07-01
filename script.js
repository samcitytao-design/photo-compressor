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
    preserveOriginalName(originalName, index = 0) {
      const rawName = String(originalName || "").trim().split(/[/\\]/).pop() || "";
      const extensionIndex = rawName.lastIndexOf(".");
      const baseName = extensionIndex > 0
        ? rawName.slice(0, extensionIndex)
        : rawName.startsWith(".")
          ? ""
          : rawName;
      return baseName.trim() || `image-${Number(index) + 1}`;
    },
    buildOutputName({ originalName, index, format, custom = "-", start = 1, pattern = "name_suffix" }) {
      const baseName = utils.preserveOriginalName(originalName, index);
      const number = Number(start || 0) + Number(index || 0);
      const text = String(custom || "").trim();

      if (pattern === "original") return `${baseName}.${format}`;
      if (pattern === "prefix_name") return `${text}${number}${baseName}.${format}`;
      return `${baseName}${text}${number}.${format}`;
    },
  };

  window.ImageCompressorUtils = utils;

  document.addEventListener("DOMContentLoaded", () => {
    const app = createApp(utils);
    app.init();
  });

  function createApp(utils) {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");
    const workspace = document.getElementById("workspace");
    const formatSelect = document.getElementById("formatSelect");
    const qualityRange = document.getElementById("qualityRange");
    const qualityValue = document.getElementById("qualityValue");
    const scaleRange = document.getElementById("scaleRange");
    const scaleValue = document.getElementById("scaleValue");
    const namePattern = document.getElementById("namePattern");
    const customPattern = document.getElementById("customPattern");
    const startNumber = document.getElementById("startNumber");
    const namePreview = document.getElementById("namePreview");
    const downloadSelected = document.getElementById("downloadSelected");
    const downloadAll = document.getElementById("downloadAll");
    const prevImage = document.getElementById("prevImage");
    const nextImage = document.getElementById("nextImage");
    const imageCounter = document.getElementById("imageCounter");
    const originalPreview = document.getElementById("originalPreview");
    const compressedPreview = document.getElementById("compressedPreview");
    const originalMeta = document.getElementById("originalMeta");
    const compressedMeta = document.getElementById("compressedMeta");
    const batchStats = document.getElementById("batchStats");
    const batchList = document.getElementById("batchList");
    const toastRegion = document.getElementById("toastRegion");
    const fullscreenPreview = document.getElementById("fullscreenPreview");
    const fullscreenImage = document.getElementById("fullscreenImage");
    const closeFullscreen = document.getElementById("closeFullscreen");
    const processingState = document.getElementById("processingState");

    const state = {
      files: [],
      currentIndex: 0,
      results: new Map(),
      sourceUrls: new Map(),
      compressedPreviewUrl: "",
      busy: false,
    };

    return {
      init() {
        if (!uploadArea || !fileInput || !workspace) return;

        prepareFormatOptions();
        bindEvents();
        updateNamePreview();
        updateNav();
        updateButtons();
      },
    };

    function bindEvents() {
      uploadArea.addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", () => {
        addFiles(Array.from(fileInput.files || []));
        fileInput.value = "";
      });

      uploadArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        uploadArea.classList.add("is-dragging");
      });

      uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("is-dragging");
      });

      uploadArea.addEventListener("drop", (event) => {
        event.preventDefault();
        uploadArea.classList.remove("is-dragging");
        addFiles(Array.from(event.dataTransfer.files || []));
      });

      qualityRange.addEventListener("input", () => {
        qualityValue.textContent = `${qualityRange.value}%`;
        clearPixelResults("点击下载时按当前质量压缩");
      });

      scaleRange.addEventListener("input", () => {
        scaleValue.textContent = `${scaleRange.value}%`;
        clearPixelResults("点击下载时按当前尺寸压缩");
      });

      formatSelect.addEventListener("change", () => {
        updateNamePreview();
        clearPixelResults("点击下载时按当前格式压缩");
      });

      for (const element of [namePattern, customPattern, startNumber]) {
        element.addEventListener("input", () => {
          updateNamePreview();
          renderBatchList();
        });
        element.addEventListener("change", () => {
          updateNamePreview();
          renderBatchList();
        });
      }

      prevImage.addEventListener("click", () => selectImage(state.currentIndex - 1));
      nextImage.addEventListener("click", () => selectImage(state.currentIndex + 1));
      downloadSelected.addEventListener("click", compressCurrentForDownload);
      downloadAll.addEventListener("click", compressAllForDownload);

      document.querySelectorAll("[data-preview]").forEach((button) => {
        button.addEventListener("click", () => openFullscreen(button.dataset.preview));
      });

      closeFullscreen.addEventListener("click", closeFullscreenPreview);
      fullscreenPreview.addEventListener("click", (event) => {
        if (event.target === fullscreenPreview) closeFullscreenPreview();
      });

      document.addEventListener("keydown", (event) => {
        if (!fullscreenPreview.hidden && event.key === "Escape") closeFullscreenPreview();
        if (state.files.length < 2 || !fullscreenPreview.hidden) return;
        if (event.key === "ArrowLeft") selectImage(state.currentIndex - 1);
        if (event.key === "ArrowRight") selectImage(state.currentIndex + 1);
      });
    }

    function prepareFormatOptions() {
      if (supportsWebP()) return;

      const webpOption = formatSelect.querySelector('option[value="webp"]');
      if (webpOption) webpOption.remove();
      formatSelect.value = "jpeg";
      showToast("当前浏览器不支持 WebP，已切换为 JPEG");
    }

    function supportsWebP() {
      const canvas = document.createElement("canvas");
      if (!canvas.getContext) return false;
      return canvas.toDataURL("image/webp").startsWith("data:image/webp");
    }

    function addFiles(fileList) {
      const imageFiles = fileList.filter((file) => file.type.startsWith("image/"));
      const skipped = fileList.length - imageFiles.length;
      const existing = new Set(state.files.map(fileKey));
      const uniqueFiles = imageFiles.filter((file) => !existing.has(fileKey(file)));

      if (skipped > 0) showToast(`已跳过 ${skipped} 个非图片文件`);
      if (uniqueFiles.length === 0) {
        if (imageFiles.length > 0) showToast("这些图片已经在列表中");
        return;
      }

      const firstNewIndex = state.files.length;
      state.files.push(...uniqueFiles);
      workspace.hidden = false;
      state.currentIndex = firstNewIndex;

      showToast(`已添加 ${uniqueFiles.length} 张图片`);
      selectImage(firstNewIndex);
    }

    function fileKey(file) {
      return `${file.name}:${file.size}:${file.lastModified}`;
    }

    function getSettings() {
      return {
        format: formatSelect.value,
        quality: Number(qualityRange.value) / 100,
        scale: Number(scaleRange.value) / 100,
        custom: customPattern.value,
        start: Number(startNumber.value),
        pattern: namePattern.value,
      };
    }

    async function compressAndStore(index) {
      const file = state.files[index];
      if (!file) return;

      try {
        const result = await compressFile(file);
        state.results.set(fileKey(file), result);
      } catch (error) {
        state.results.set(fileKey(file), { error: error.message || "压缩失败" });
      }
    }

    async function compressFile(file) {
      const image = await loadDrawableImage(file);
      const settings = getSettings();
      const originalWidth = image.width;
      const originalHeight = image.height;
      const width = Math.max(1, Math.round(originalWidth * settings.scale));
      const height = Math.max(1, Math.round(originalHeight * settings.scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = width;
      canvas.height = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);
      if (typeof image.close === "function") image.close();

      const mimeType = utils.mimeForFormat(settings.format);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (nextBlob) resolve(nextBlob);
          else reject(new Error("无法导出压缩图片"));
        }, mimeType, settings.quality);
      });

      return {
        blob,
        mimeType,
        originalWidth,
        originalHeight,
        width,
        height,
        ratio: utils.compressionRatio(file.size, blob.size),
      };
    }

    async function loadDrawableImage(file) {
      if ("createImageBitmap" in window) {
        return createImageBitmap(file);
      }

      const url = URL.createObjectURL(file);
      try {
        return await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("图片读取失败"));
          image.src = url;
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    function selectImage(index) {
      if (index < 0 || index >= state.files.length) return;
      state.currentIndex = index;
      setCurrentOriginalPreview();
      updateCompressedPreview();
      updateNav();
      updateButtons();
      updateNamePreview();
      renderBatchList();
    }

    function setCurrentOriginalPreview() {
      const file = state.files[state.currentIndex];
      if (!file) return;

      const key = fileKey(file);
      if (!state.sourceUrls.has(key)) {
        state.sourceUrls.set(key, URL.createObjectURL(file));
      }

      originalPreview.src = state.sourceUrls.get(key);
      originalMeta.textContent = `${file.name} · ${utils.formatBytes(file.size)}`;
    }

    function setCompressedPlaceholder(message) {
      revokeCompressedPreviewUrl();
      compressedPreview.removeAttribute("src");
      compressedMeta.textContent = message;
    }

    function updateCompressedPreview() {
      const file = state.files[state.currentIndex];
      if (!file) return;

      const result = state.results.get(fileKey(file));
      if (!result) {
        setCompressedPlaceholder("点击下载时生成压缩图");
        return;
      }

      if (result.error) {
        setCompressedPlaceholder(result.error);
        return;
      }

      revokeCompressedPreviewUrl();
      state.compressedPreviewUrl = URL.createObjectURL(result.blob);
      compressedPreview.src = state.compressedPreviewUrl;
      compressedMeta.textContent = [
        `${utils.formatBytes(file.size)} → ${utils.formatBytes(result.blob.size)}`,
        `${result.originalWidth}×${result.originalHeight} → ${result.width}×${result.height}`,
        result.ratio >= 0 ? `节省 ${result.ratio}%` : `增加 ${Math.abs(result.ratio)}%`,
      ].join(" · ");
    }

    function renderBatchList() {
      batchList.innerHTML = "";

      state.files.forEach((file, index) => {
        const key = fileKey(file);
        const result = state.results.get(key);
        const item = document.createElement("article");
        const button = document.createElement("button");
        const image = document.createElement("img");
        const info = document.createElement("div");
        const name = document.createElement("div");
        const meta = document.createElement("div");
        const ratio = document.createElement("div");

        item.className = `batch-item${index === state.currentIndex ? " is-selected" : ""}`;
        button.type = "button";
        button.setAttribute("aria-label", `预览 ${file.name}`);
        button.addEventListener("click", () => selectImage(index));

        if (!state.sourceUrls.has(key)) {
          state.sourceUrls.set(key, URL.createObjectURL(file));
        }

        image.src = state.sourceUrls.get(key);
        image.alt = file.name;

        name.className = "batch-name";
        name.textContent = file.name;
        meta.className = "batch-meta";
        ratio.className = "ratio neutral";

        if (!result) {
          meta.textContent = `${utils.formatBytes(file.size)} · 待下载时压缩`;
          ratio.textContent = "待处理";
        } else if (result.error) {
          meta.textContent = result.error;
          ratio.className = "ratio negative";
          ratio.textContent = "失败";
        } else {
          meta.textContent = `${utils.formatBytes(file.size)} → ${utils.formatBytes(result.blob.size)} · ${result.originalWidth}×${result.originalHeight} → ${result.width}×${result.height}`;
          ratio.className = `ratio ${result.ratio >= 0 ? "positive" : "negative"}`;
          ratio.textContent = result.ratio >= 0 ? `↓ ${result.ratio}%` : `↑ ${Math.abs(result.ratio)}%`;
        }

        info.append(name, meta);
        button.append(image, info, ratio);
        item.append(button);
        batchList.append(item);
      });

      updateStats();
      updateNav();
      updateButtons();
    }

    function updateStats() {
      if (state.files.length === 0) {
        batchStats.textContent = "等待图片";
        return;
      }

      let originalTotal = 0;
      let compressedTotal = 0;
      let readyCount = 0;

      for (const file of state.files) {
        const result = state.results.get(fileKey(file));
        if (!result || result.error) continue;
        originalTotal += file.size;
        compressedTotal += result.blob.size;
        readyCount += 1;
      }

      if (readyCount === 0) {
        batchStats.textContent = `${state.files.length} 张图片 · 等待下载时压缩`;
        return;
      }

      const ratio = utils.compressionRatio(originalTotal, compressedTotal);
      batchStats.textContent = `${readyCount}/${state.files.length} 张完成 · ${utils.formatBytes(originalTotal)} → ${utils.formatBytes(compressedTotal)} · ${ratio >= 0 ? "节省" : "增加"} ${Math.abs(ratio)}%`;
    }

    function updateNav() {
      const count = state.files.length;
      imageCounter.textContent = count ? `${state.currentIndex + 1} / ${count}` : "0 / 0";
      prevImage.disabled = count < 2 || state.currentIndex === 0;
      nextImage.disabled = count < 2 || state.currentIndex >= count - 1;
    }

    function updateButtons() {
      const current = state.files[state.currentIndex];

      downloadSelected.disabled = !current || state.busy;
      downloadAll.disabled = state.files.length === 0 || state.busy;
    }

    function updateNamePreview() {
      const file = state.files[state.currentIndex];
      const originalName = file ? file.name : "photo.jpg";
      const label = file ? "下载名称" : "示例";
      const settings = getSettings();
      namePreview.textContent = `${label}：${utils.buildOutputName({
        originalName,
        index: state.currentIndex,
        format: settings.format,
        custom: settings.custom,
        start: settings.start,
        pattern: settings.pattern,
      })}`;
    }

    function setProcessingState(text) {
      processingState.textContent = text;
    }

    function clearPixelResults(message) {
      state.results.clear();
      setProcessingState(state.files.length ? "等待下载" : "准备就绪");
      if (state.files.length) setCompressedPlaceholder(message);
      updateNamePreview();
      renderBatchList();
      updateButtons();
    }

    async function compressCurrentForDownload() {
      const file = state.files[state.currentIndex];
      if (!file) {
        showToast("请先上传图片");
        return;
      }

      state.busy = true;
      setProcessingState("压缩中...");
      setCompressedPlaceholder("正在生成压缩图片...");
      updateButtons();

      try {
        await compressAndStore(state.currentIndex);
        const result = state.results.get(fileKey(file));
        updateCompressedPreview();
        renderBatchList();

        if (!result || result.error) throw new Error(result?.error || "压缩失败");
        saveBlob(result.blob, outputNameForIndex(state.currentIndex));
        showToast("已下载压缩图片");
        setProcessingState("完成");
      } catch (error) {
        showToast(error.message || "压缩失败，请重试");
        setProcessingState("压缩失败");
      } finally {
        state.busy = false;
        updateButtons();
      }
    }

    async function compressAllForDownload() {
      if (!window.JSZip) {
        showToast("JSZip 加载失败，暂时无法打包下载");
        return;
      }
      if (state.files.length === 0) {
        showToast("请先上传图片");
        return;
      }

      const zip = new JSZip();
      const folder = zip.folder("compressed-images");
      const usedNames = new Set();
      state.busy = true;
      state.results.clear();
      setProcessingState("打包中...");
      updateButtons();
      renderBatchList();

      try {
        for (let index = 0; index < state.files.length; index += 1) {
          const file = state.files[index];
          await compressAndStore(index);
          const result = state.results.get(fileKey(file));
          if (!result || result.error) throw new Error(`${file.name} 压缩失败`);
          folder.file(uniqueOutputName(index, usedNames), result.blob);
          if (index === state.currentIndex) updateCompressedPreview();
          renderBatchList();
        }

        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        });
        saveBlob(zipBlob, `压缩图片_${state.files.length}张.zip`);
        showToast("ZIP 已生成");
        setProcessingState("完成");
      } catch (error) {
        showToast(error.message || "打包失败，请重试");
        setProcessingState("打包失败");
      } finally {
        state.busy = false;
        updateButtons();
      }
    }

    function outputNameForIndex(index) {
      const settings = getSettings();
      return utils.buildOutputName({
        originalName: state.files[index].name,
        index,
        format: settings.format,
        custom: settings.custom,
        start: settings.start,
        pattern: settings.pattern,
      });
    }

    function uniqueOutputName(index, usedNames) {
      const filename = outputNameForIndex(index);
      if (!usedNames.has(filename)) {
        usedNames.add(filename);
        return filename;
      }

      const dotIndex = filename.lastIndexOf(".");
      const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
      const extension = dotIndex > 0 ? filename.slice(dotIndex) : "";
      let counter = 2;
      let nextName = `${base}-${counter}${extension}`;

      while (usedNames.has(nextName)) {
        counter += 1;
        nextName = `${base}-${counter}${extension}`;
      }

      usedNames.add(nextName);
      return nextName;
    }

    function saveBlob(blob, filename) {
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 800);
    }

    function openFullscreen(kind) {
      const source = kind === "original" ? originalPreview.src : compressedPreview.src;
      if (!source) return;
      fullscreenImage.src = source;
      fullscreenPreview.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeFullscreenPreview() {
      fullscreenPreview.hidden = true;
      fullscreenImage.removeAttribute("src");
      document.body.style.overflow = "";
    }

    function showToast(message) {
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.textContent = message;
      toastRegion.append(toast);
      setTimeout(() => toast.remove(), 3200);
    }

    function revokeCompressedPreviewUrl() {
      if (!state.compressedPreviewUrl) return;
      URL.revokeObjectURL(state.compressedPreviewUrl);
      state.compressedPreviewUrl = "";
    }
  }
})();
