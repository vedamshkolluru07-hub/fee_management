// src/config/s3.js
//
// Requires env vars:
//   AWS_REGION
//   AWS_ACCESS_KEY_ID
//   AWS_SECRET_ACCESS_KEY
//   S3_BUCKET_NAME
//   S3_PUBLIC_BASE_URL   e.g. https://your-bucket.s3.your-region.amazonaws.com
//                        or your CloudFront domain if you put one in front of the bucket
//
// npm install @aws-sdk/client-s3 multer multer-s3

const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL;

/** Builds the public URL for a given object key. */
function publicUrlFor(key) {
  return `${PUBLIC_BASE_URL}/${key}`;
}

module.exports = { s3Client, BUCKET_NAME, publicUrlFor };
