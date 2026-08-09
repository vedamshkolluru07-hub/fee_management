// config/multerMemory.js
//
// In-memory multer storage for image uploads that need to be resized
// (via sharp) before being sent to S3. Used by website_management's
// image upload endpoint (home page blocks, about page, etc).

const multer = require('multer');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB per file, resized down afterwards
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP or GIF images are allowed'));
    }
    return cb(null, true);
  },
});

module.exports = upload;
