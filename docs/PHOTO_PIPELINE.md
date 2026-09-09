# EchoWall Photo Pipeline

## Release configuration

- Cloudinary cloud name: `das8chiyz`
- Upload preset: `EchoWall`
- Mode: unsigned
- Overwrite: `false`
- Endpoint: `https://api.cloudinary.com/v1_1/das8chiyz/image/upload`
- Feature switch: `EchoConfig.features.photoUploads`

The cloud name and unsigned preset are public client configuration. No
Cloudinary API secret or signed-upload credential belongs in this repository.

## Browser processing

`services/photo-service.js` accepts JPEG, PNG, and WebP up to 8 MB. HEIC and
other unsupported formats are rejected with a clear message rather than
claiming decoder support.

Final settings:

- Maximum long edge: 1920 px; smaller images are never upscaled.
- Initial lossy quality: 0.82, reduced only when required.
- Target output size: approximately 900 KB.
- Preferred output: WebP; a transparent source falls back to PNG if WebP
  encoding is unavailable, never to transparency-destroying JPEG.

`createImageBitmap` is requested with orientation handling, with the existing
Image element fallback where needed. Every accepted image is drawn to canvas
and encoded into a new Blob. This re-encoding is the privacy boundary that
drops source EXIF/GPS metadata while preserving the decoded visual orientation.

## Upload and database ordering

`services/cloudinary-adapter.js` contains a replaceable
`UnsignedCloudinaryAdapter`. It sends only the file, preset, and `overwrite`
flag, then validates HTTPS host/cloud path, public ID, dimensions, byte count,
and format before accepting the response.

`services/photo-publish-service.js` performs:

1. one guarded Cloudinary upload;
2. one Supabase `create_post_with_media` call;
3. an atomic post plus `app.media_assets` insert in the database migration.

A failed upload never creates a post row. If Cloudinary succeeds but the DB
transaction fails, the browser keeps only the returned `publicId`, URL, time,
and cleanup reason in `getLastOrphan()` for an operator cleanup workflow. It
does not retry into duplicate public content or retain the image bytes/EXIF.
The composer and repository each have in-flight protection.

## Security limitation

The `EchoWall` preset is unsigned and therefore callable by anyone who knows
the public cloud name and preset. Verified EchoWall account checks protect the
normal application publishing flow but do **not** make Cloudinary's endpoint
private. Configure preset-side file/size restrictions, moderation, usage alerts,
and future authenticated signing/cleanup outside the browser as operational
controls.

Home Photo Notes remains the approved presentation value 53. It is not derived
from raw Cloudinary assets.
