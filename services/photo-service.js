(function () {
  "use strict";

  const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
  const MAX_LONG_EDGE = 1920;
  const TARGET_BYTES = 900 * 1024;
  const INITIAL_QUALITY = 0.82;
  const MIN_QUALITY = 0.58;
  const ALLOWED_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);

  function validateFile(file) {
    if (!file || !ALLOWED_TYPES.includes(String(file.type || "").toLowerCase())) {
      throw new Error("Please choose a JPG, PNG, or WebP image. HEIC is not supported reliably in this browser.");
    }
    if (!Number.isFinite(Number(file.size)) || Number(file.size) <= 0) throw new Error("The selected image is empty or unreadable.");
    if (Number(file.size) > MAX_SOURCE_BYTES) throw new Error("The original image must be 8 MB or smaller.");
    return true;
  }

  function calculateDimensions(width, height, maxLongEdge = MAX_LONG_EDGE) {
    const sourceWidth = Number(width);
    const sourceHeight = Number(height);
    if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error("The selected file does not contain valid image dimensions.");
    }
    const scale = Math.min(1, maxLongEdge / Math.max(sourceWidth, sourceHeight));
    return Object.freeze({ width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)), scale });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("The processed image could not be read."));
      reader.readAsDataURL(blob);
    });
  }

  async function decodeImage(file) {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() };
      } catch {
        // Older browsers may reject the orientation option; the Image fallback still honors display orientation.
      }
    }
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => {} });
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("The selected file is not a readable image."));
      };
      image.src = objectUrl;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob || (type !== "image/png" && blob.type && blob.type !== type)) {
          reject(new Error(`This browser cannot encode ${type}.`));
          return;
        }
        resolve(blob);
      }, type, quality);
    });
  }

  async function encodeCanvas({ source, width, height, type, quality }) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const drawing = canvas.getContext("2d", { alpha: true });
    if (!drawing) throw new Error("Image processing is not available in this browser.");
    drawing.drawImage(source, 0, 0, width, height);
    return canvasToBlob(canvas, type, quality);
  }

  function candidateTypes(sourceType) {
    return sourceType === "image/jpeg" ? ["image/webp", "image/jpeg"] : ["image/webp", "image/png"];
  }

  async function encodeWithFallback(options, encode) {
    let lastError;
    for (const type of candidateTypes(options.sourceType)) {
      try {
        const blob = await encode({ ...options, type });
        if (blob) return { blob, type: blob.type || type };
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error("This browser could not encode the selected image.");
  }

  async function processImage(file, dependencies = {}) {
    validateFile(file);
    const decode = dependencies.decode || decodeImage;
    const encode = dependencies.encode || encodeCanvas;
    const toDataUrl = dependencies.blobToDataUrl || blobToDataUrl;
    const decoded = await decode(file);
    let dimensions = calculateDimensions(decoded.width, decoded.height);
    let quality = INITIAL_QUALITY;
    let result;
    try {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        result = await encodeWithFallback({ source: decoded.source, sourceType: String(file.type).toLowerCase(), width: dimensions.width, height: dimensions.height, quality }, encode);
        if (result.blob.size <= TARGET_BYTES) break;
        if (quality > MIN_QUALITY) quality = Math.max(MIN_QUALITY, quality - 0.06);
        else dimensions = calculateDimensions(Math.round(dimensions.width * 0.84), Math.round(dimensions.height * 0.84));
      }
    } finally {
      decoded.close?.();
    }
    if (!result?.blob || result.blob.size > TARGET_BYTES * 1.15) throw new Error("This image is too detailed to upload. Please choose a smaller image.");
    const dataUrl = await toDataUrl(result.blob);
    return Object.freeze({
      blob: result.blob,
      dataUrl,
      width: dimensions.width,
      height: dimensions.height,
      bytes: result.blob.size,
      format: result.type.replace(/^image\//, ""),
      mimeType: result.type,
      sourceBytes: Number(file.size),
      reencoded: true,
    });
  }

  function dataUrlByteSize(dataUrl) {
    const base64 = String(dataUrl || "").split(",")[1] || "";
    const padding = (base64.match(/=*$/) || [""])[0].length;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
  }

  window.PhotoService = Object.freeze({
    MAX_SOURCE_BYTES, MAX_LONG_EDGE, TARGET_BYTES, INITIAL_QUALITY, ALLOWED_TYPES,
    validateFile, calculateDimensions, processImage, dataUrlByteSize,
  });
}());
