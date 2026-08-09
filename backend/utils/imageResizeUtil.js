// utils/imageResizeUtil.js
//
// Resizes/compresses images before they go to S3, so the public
// home page isn't slowed down by full-resolution phone photos.
// Requires: npm install sharp

const sharp = require('sharp');

const MAX_WIDTH = 1600;
const THUMB_WIDTH = 400;
const JPEG_QUALITY = 78;

/**
 * Resizes a full-size image (used for the actual home/about page image).
 * Keeps aspect ratio, never upscales, converts to JPEG for consistent
 * small file size (transparent PNGs are flattened onto white).
 */
async function resizeMain(buffer) {
  return sharp(buffer)
    .rotate() // respects EXIF orientation
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

/**
 * Resizes a small thumbnail (used in the admin editor's block palette
 * / carousel previews so the editor stays fast).
 */
async function resizeThumbnail(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 70 })
    .toBuffer();
}

module.exports = { resizeMain, resizeThumbnail };
