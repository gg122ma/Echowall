(function () {
  function isConfigured() {
    const config = window.EchoConfig?.cloudinary || {};
    return Boolean(config.cloudName && config.signatureEndpoint);
  }

  function dataUrlToBlob(dataUrl) {
    const [header, base64] = String(dataUrl || "").split(",");
    const mime = /data:([^;]+)/.exec(header || "")?.[1] || "image/jpeg";
    const binary = atob(base64 || "");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  async function uploadCompressedDataUrl(dataUrl, context = {}) {
    if (!dataUrl) return null;
    if (!isConfigured()) return { mode: "local", dataUrl };

    const config = window.EchoConfig.cloudinary;
    const signatureResponse = await fetch(config.signatureEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: config.uploadFolder, context }),
    });
    if (!signatureResponse.ok) throw new Error("Could not obtain a Cloudinary upload signature.");
    const signatureData = await signatureResponse.json();
    const form = new FormData();
    form.append("file", dataUrlToBlob(dataUrl));
    form.append("api_key", signatureData.apiKey);
    form.append("timestamp", signatureData.timestamp);
    form.append("signature", signatureData.signature);
    form.append("folder", signatureData.folder || config.uploadFolder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`, { method: "POST", body: form });
    if (!response.ok) throw new Error("Cloudinary upload failed.");
    const uploaded = await response.json();
    return {
      mode: "cloudinary",
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
    };
  }

  window.CloudinaryAdapter = { isConfigured, uploadCompressedDataUrl };
})();
