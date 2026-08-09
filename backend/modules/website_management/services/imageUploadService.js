// modules/website_management/services/imageUploadService.js

const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, BUCKET_NAME, publicUrlFor } = require('../../../config/s3.js');
const { resizeMain, resizeThumbnail } = require('../../../utils/imageResizeUtil.js');

/**
 * ======================================================
 * 🔹 UPLOAD ONE IMAGE (resize + thumbnail, both to S3)
 * ======================================================
 * Returns { url, thumbnailUrl, s3Key }
 */
async function uploadImage(file, folder = 'homepage') {
  if (!file || !file.buffer) {
    throw new Error('No file provided');
  }

  const [mainBuffer, thumbBuffer] = await Promise.all([
    resizeMain(file.buffer),
    resizeThumbnail(file.buffer),
  ]);

  const uniqueId = crypto.randomUUID();
  const mainKey = `${folder}/${uniqueId}.jpg`;
  const thumbKey = `${folder}/${uniqueId}_thumb.jpg`;

  await Promise.all([
    s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: mainKey,
        Body: mainBuffer,
        ContentType: 'image/jpeg',
      })
    ),
    s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: 'image/jpeg',
      })
    ),
  ]);

  return {
    url: publicUrlFor(mainKey),
    thumbnailUrl: publicUrlFor(thumbKey),
    s3Key: mainKey,
  };
}

/**
 * ======================================================
 * 🔹 UPLOAD MULTIPLE IMAGES (for a carousel image block)
 * ======================================================
 */
async function uploadImages(files = [], folder = 'homepage') {
  const results = [];
  for (const file of files) {
    // sequential to keep S3/memory usage predictable for small servers
    // eslint-disable-next-line no-await-in-loop
    const uploaded = await uploadImage(file, folder);
    results.push(uploaded);
  }
  return results;
}

module.exports = { uploadImage, uploadImages };
