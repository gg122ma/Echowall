#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
let passed = 0;
function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log(`PASS - ${name}`);
}
async function rejects(name, action, pattern) {
  await assert.rejects(action, pattern);
  passed += 1;
  console.log(`PASS - ${name}`);
}

const window = {
  EchoConfig: { cloudinary: { cloudName: "das8chiyz", uploadPreset: "EchoWall", mode: "unsigned", overwrite: false } },
};
window.window = window;
const context = { window, console, Object, Number, String, Date, Math, Promise, Error, URL, Blob, FormData, Uint8Array, atob, setTimeout, clearTimeout };
vm.createContext(context);
for (const file of ["services/photo-service.js", "services/cloudinary-adapter.js", "services/photo-publish-service.js"]) {
  vm.runInContext(read(file), context, { filename: file });
}

for (const type of ["image/jpeg", "image/png", "image/webp"]) {
  check(`${type} is accepted`, window.PhotoService.validateFile({ type, size: 1000 }));
}
await rejects("HEIC is rejected without fake decoder support", async () => window.PhotoService.validateFile({ type: "image/heic", size: 1000 }), /HEIC is not supported/i);
await rejects("unsupported image type is rejected", async () => window.PhotoService.validateFile({ type: "image/gif", size: 1000 }), /JPG, PNG, or WebP/i);
await rejects("empty file is rejected", async () => window.PhotoService.validateFile({ type: "image/jpeg", size: 0 }), /empty or unreadable/i);
await rejects("source larger than 8 MB is rejected", async () => window.PhotoService.validateFile({ type: "image/jpeg", size: 8 * 1024 * 1024 + 1 }), /8 MB/i);

let dimensions = window.PhotoService.calculateDimensions(4000, 3000);
check("large landscape is resized to 1920 long edge", dimensions.width === 1920 && dimensions.height === 1440);
dimensions = window.PhotoService.calculateDimensions(1200, 800);
check("small image is never upscaled", dimensions.width === 1200 && dimensions.height === 800 && dimensions.scale === 1);
dimensions = window.PhotoService.calculateDimensions(2000, 4000);
check("portrait orientation dimensions are preserved", dimensions.width === 960 && dimensions.height === 1920);

const defaultDecode = async () => ({ source: {}, width: 4000, height: 3000, close: () => {} });
const encodeCalls = [];
const processedJpeg = await window.PhotoService.processImage({ type: "image/jpeg", size: 5_000_000 }, {
  decode: defaultDecode,
  encode: async options => {
    encodeCalls.push(options);
    return new Blob([new Uint8Array(450_000)], { type: options.type });
  },
  blobToDataUrl: async blob => `data:${blob.type};base64,AA==`,
});
check("large JPEG is re-encoded at 1920px without metadata passthrough", processedJpeg.reencoded && processedJpeg.width === 1920 && processedJpeg.blob.size === 450000);
check("initial photo quality is 0.82", encodeCalls[0].quality === 0.82);
check("JPEG prefers WebP browser-native output", processedJpeg.format === "webp");

const pngTypes = [];
const processedPng = await window.PhotoService.processImage({ type: "image/png", size: 300_000 }, {
  decode: async () => ({ source: {}, width: 800, height: 600, close: () => {} }),
  encode: async options => {
    pngTypes.push(options.type);
    if (options.type === "image/webp") throw new Error("unsupported");
    return new Blob([new Uint8Array(200_000)], { type: "image/png" });
  },
  blobToDataUrl: async blob => `data:${blob.type};base64,AA==`,
});
check("transparent PNG falls back to PNG instead of JPEG", pngTypes.join(",") === "image/webp,image/png" && processedPng.format === "png");

let closed = false;
let iterations = 0;
const compressed = await window.PhotoService.processImage({ type: "image/webp", size: 7_000_000 }, {
  decode: async () => ({ source: {}, width: 3000, height: 2000, close: () => { closed = true; } }),
  encode: async options => {
    iterations += 1;
    return new Blob([new Uint8Array(iterations < 4 ? 1_000_000 : 500_000)], { type: options.type });
  },
  blobToDataUrl: async blob => `data:${blob.type};base64,AA==`,
});
check("detailed image iteratively compresses below the target", iterations === 4 && compressed.bytes === 500000);
check("decoded bitmap resources are released", closed);
await rejects("corrupt image decode fails cleanly", () => window.PhotoService.processImage({ type: "image/jpeg", size: 100 }, { decode: async () => { throw new Error("The selected file is not a readable image."); } }), /not a readable image/i);
check("source implementation requests orientation-aware bitmap decoding", /imageOrientation:\s*"from-image"/.test(read("services/photo-service.js")));
check("canvas re-encoding is the metadata/EXIF stripping boundary", /drawing\.drawImage[\s\S]*canvasToBlob/.test(read("services/photo-service.js")));

check("unsigned Cloudinary configuration is active", window.CloudinaryAdapter.isConfigured());
const disabledAdapter = new window.UnsignedCloudinaryAdapter(window.EchoConfig.cloudinary, { enabled: false, fetch: async () => { throw new Error("must not run"); } });
check("photo feature switch disables the adapter", !disabledAdapter.isConfigured());
let requestedUrl = "";
let requestedForm;
const adapter = new window.UnsignedCloudinaryAdapter(window.EchoConfig.cloudinary, {
  fetch: async (url, options) => {
    requestedUrl = url;
    requestedForm = options.body;
    return {
      ok: true,
      json: async () => ({ secure_url: "https://res.cloudinary.com/das8chiyz/image/upload/v1/echo/photo.webp", public_id: "echo/photo", width: 1200, height: 800, bytes: 345678, format: "webp" }),
    };
  },
});
const uploaded = await adapter.uploadPhoto(new Blob([new Uint8Array(100)], { type: "image/webp" }), { filename: "campus.webp" });
check("Cloudinary endpoint uses public cloud name das8chiyz", requestedUrl === "https://api.cloudinary.com/v1_1/das8chiyz/image/upload");
check("unsigned request sends EchoWall preset", requestedForm.get("upload_preset") === "EchoWall");
check("unsigned request explicitly keeps overwrite false", requestedForm.get("overwrite") === "false");
check("validated Cloudinary response retains useful metadata", uploaded.publicId === "echo/photo" && uploaded.width === 1200 && uploaded.bytes === 345678 && uploaded.format === "webp");
await rejects("invalid Cloudinary delivery host is rejected", async () => window.CloudinaryAdapter.validateUploadResponse({ secure_url: "https://evil.example/photo", public_id: "photo", width: 1, height: 1, bytes: 1, format: "jpg" }, "das8chiyz"), /invalid delivery URL/i);
await rejects("incomplete Cloudinary success response is rejected", async () => window.CloudinaryAdapter.validateUploadResponse({ secure_url: "https://res.cloudinary.com/das8chiyz/image/upload/a.jpg" }, "das8chiyz"), /incomplete image metadata/i);
const failingAdapter = new window.UnsignedCloudinaryAdapter(window.EchoConfig.cloudinary, { fetch: async () => { throw new Error("offline detail"); } });
await rejects("Cloudinary network failure is human-readable", () => failingAdapter.uploadPhoto(new Blob(["x"], { type: "image/webp" })), /could not reach the network/i);

let releaseUpload;
const delayedAdapter = { uploadPhoto: () => new Promise(resolve => { releaseUpload = resolve; }) };
const firstPublish = window.PhotoPublishService.publish({ asset: { blob: new Blob(["x"]) }, filename: "one.webp", persist: async () => "saved", adapter: delayedAdapter });
await rejects("double photo submission is rejected while first is active", () => window.PhotoPublishService.publish({ asset: { blob: new Blob(["x"]) }, persist: async () => {}, adapter: delayedAdapter }), /already being published/i);
releaseUpload(uploaded);
check("first delayed photo submission completes once", (await firstPublish).result === "saved");

let persistCalls = 0;
await rejects("database failure after upload is surfaced without a second upload", () => window.PhotoPublishService.publish({
  asset: { blob: new Blob(["x"]) }, filename: "db-fail.webp", adapter: { uploadPhoto: async () => uploaded },
  persist: async () => { persistCalls += 1; throw new Error("db unavailable"); },
}), /recorded for cleanup/i);
check("database persistence is attempted exactly once", persistCalls === 1);
check("orphan metadata is retained for cleanup without EXIF or file bytes", window.PhotoPublishService.getLastOrphan()?.publicId === "echo/photo" && !window.PhotoPublishService.getLastOrphan()?.blob);
let failedUploadPersistCalls = 0;
await rejects("failed upload never creates a database row", () => window.PhotoPublishService.publish({
  asset: { blob: new Blob(["x"]) }, adapter: { uploadPhoto: async () => { throw new Error("upload failed"); } },
  persist: async () => { failedUploadPersistCalls += 1; },
}), /upload failed/i);
check("database callback is untouched after upload failure", failedUploadPersistCalls === 0);

const repositorySource = read("services/community-supabase-repositories.js");
check("remote photo writes use a dedicated atomic post-with-media RPC", /create_post_with_media/.test(repositorySource));
check("non-photo post writes retain the existing create_post RPC", /media \? "create_post_with_media" : "create_post"/.test(repositorySource));
check("client does not contain a Cloudinary API secret", !/CLOUDINARY_API_SECRET|api_secret/i.test([read("services/cloudinary-adapter.js"), read("config/app-config.js")].join("\n")));

console.log(`\n${passed}/${passed} assertions passed.`);
