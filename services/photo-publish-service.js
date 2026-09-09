(function () {
  "use strict";
  let publishing = false;
  let lastOrphan = null;

  async function publish({ asset, filename, context = {}, persist, adapter = window.CloudinaryAdapter }) {
    if (publishing) throw new Error("That photo is already being published.");
    if (!asset?.blob || typeof persist !== "function") throw new Error("The photo publishing request is incomplete.");
    publishing = true;
    try {
      const uploaded = await adapter.uploadPhoto(asset.blob, { ...context, filename });
      try {
        const result = await persist(uploaded);
        lastOrphan = null;
        return Object.freeze({ uploaded, result });
      } catch (error) {
        lastOrphan = Object.freeze({
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          recordedAt: new Date().toISOString(),
          reason: "database_write_failed",
        });
        const wrapped = new Error("The photo uploaded, but the note could not be saved. The upload was recorded for cleanup.");
        wrapped.code = "PHOTO_DB_WRITE_FAILED";
        wrapped.cause = error;
        throw wrapped;
      }
    } finally {
      publishing = false;
    }
  }

  window.PhotoPublishService = Object.freeze({ publish, isPublishing: () => publishing, getLastOrphan: () => lastOrphan });
}());
