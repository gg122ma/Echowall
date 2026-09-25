(function () {
  "use strict";

  function configuredValues(config = window.EchoConfig?.cloudinary || {}) {
    return {
      cloudName: String(config.cloudName || "").trim(),
      uploadPreset: String(config.uploadPreset || "").trim(),
      mode: String(config.mode || "").toLowerCase(),
    };
  }

  function isConfigured(config) {
    if (config === undefined && window.EchoConfig?.features?.photoUploads === false) return false;
    const values = configuredValues(config);
    return values.mode === "unsigned" && Boolean(values.cloudName && values.uploadPreset);
  }

  function validateUploadResponse(payload, cloudName) {
    const secureUrl = String(payload?.secure_url || "");
    const publicId = String(payload?.public_id || "");
    const width = Number(payload?.width);
    const height = Number(payload?.height);
    const bytes = Number(payload?.bytes);
    const format = String(payload?.format || "").toLowerCase();
    let parsedUrl;
    try { parsedUrl = new URL(secureUrl); } catch { throw new Error("Cloudinary returned an invalid upload result."); }
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "res.cloudinary.com" || !parsedUrl.pathname.startsWith(`/${cloudName}/image/upload/`)) {
      throw new Error("Cloudinary returned an invalid delivery URL.");
    }
    if (!/^[A-Za-z0-9/_-]{1,255}$/.test(publicId) || !Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0 || !Number.isInteger(bytes) || bytes <= 0 || !/^(jpe?g|png|webp)$/.test(format)) {
      throw new Error("Cloudinary returned incomplete image metadata.");
    }
    return Object.freeze({ mode: "cloudinary", url: secureUrl, secureUrl, publicId, width, height, bytes, format });
  }

  function sanitizeDiagnosticMessage(message) {
    return String(message || "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
      .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]+)?\b/g, "[redacted token]")
      .replace(/\b(api[_ -]?(?:secret|key)|authorization|(?:supabase[_ -]?)?jwt|(?:access|refresh)?[_ -]?token)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
      .slice(0, 300);
  }

  function userFacingUploadError(status, message) {
    const normalized = String(message || "").toLowerCase();
    if (status === 429 || /rate[ -]?limit/.test(normalized)) {
      return "Cloudinary is rate-limiting uploads. Please try again shortly.";
    }
    if (status === 401 || status === 403 || /upload preset/.test(normalized)) {
      return "Photo upload configuration is unavailable.";
    }
    if (status === 413 || /file.{0,30}(too large|exceeds|maximum)|maximum.{0,20}file size/.test(normalized)) {
      return "This photo is too large for the upload service.";
    }
    if (/unsupported.{0,20}(format|image|file)|(?:format|file type|extension).{0,30}(not accepted|not allowed|unsupported|invalid)/.test(normalized)) {
      return "This photo format is not accepted by the upload service.";
    }
    return "Cloudinary could not publish this photo. Please try again.";
  }

  class UnsignedCloudinaryAdapter {
    constructor(config = window.EchoConfig?.cloudinary || {}, dependencies = {}) {
      this.config = configuredValues(config);
      this.fetch = dependencies.fetch || window.fetch.bind(window);
      this.enabled = dependencies.enabled ?? window.EchoConfig?.features?.photoUploads !== false;
    }

    isConfigured() { return this.enabled && isConfigured(this.config); }

    async uploadPhoto(file, context = {}) {
      if (!this.isConfigured()) throw new Error("Photo upload is not configured.");
      if (!file || !Number.isFinite(Number(file.size)) || Number(file.size) <= 0) throw new Error("The processed photo is empty.");
      const form = new FormData();
      form.append("file", file, String(context.filename || "echowall-photo.webp").slice(0, 120));
      form.append("upload_preset", this.config.uploadPreset);
      const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.config.cloudName)}/image/upload`;
      let response;
      try { response = await this.fetch(endpoint, { method: "POST", body: form }); }
      catch { throw new Error("Cloudinary upload could not reach the network. Please try again."); }
      let payload;
      try { payload = await response.json(); } catch { payload = null; }
      if (!response.ok) {
        const status = Number(response.status) || 0;
        const rawMessage = String(payload?.error?.message || "");
        const diagnosticMessage = sanitizeDiagnosticMessage(rawMessage);
        console.error("[EchoWall] Cloudinary upload rejected", {
          httpStatus: status,
          cloudinaryMessage: diagnosticMessage,
        });
        throw new Error(userFacingUploadError(status, rawMessage));
      }
      if (!payload) throw new Error("Cloudinary returned an invalid upload result.");
      return validateUploadResponse(payload, this.config.cloudName);
    }
  }

  function dataUrlToBlob(dataUrl) {
    const [header, base64] = String(dataUrl || "").split(",");
    const mime = /data:([^;]+)/.exec(header || "")?.[1] || "image/jpeg";
    const binary = atob(base64 || "");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  function makeDefaultAdapter() {
    return new UnsignedCloudinaryAdapter();
  }

  window.UnsignedCloudinaryAdapter = UnsignedCloudinaryAdapter;
  window.CloudinaryAdapter = Object.freeze({
    isConfigured: () => isConfigured(),
    uploadPhoto: (file, context) => makeDefaultAdapter().uploadPhoto(file, context),
    uploadCompressedDataUrl: (dataUrl, context) => makeDefaultAdapter().uploadPhoto(dataUrlToBlob(dataUrl), context),
    validateUploadResponse,
  });
}());
