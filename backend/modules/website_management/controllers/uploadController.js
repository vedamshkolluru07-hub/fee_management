// modules/website_management/controllers/uploadController.js

const imageUploadService = require('../services/imageUploadService.js');

/** POST /api/website/upload/images — admin, multipart field name "images" */
async function uploadImages(req, res) {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: 'No images provided' });
    }

    const folder = req.body?.folder === 'about' ? 'about' : 'homepage';
    const uploaded = await imageUploadService.uploadImages(files, folder);

    return res.status(201).json({ success: true, data: uploaded });
  } catch (err) {
    console.error('❌ [uploadController] uploadImages error:', err.message);
    return res.status(500).json({ success: false, message: 'Image upload failed' });
  }
}

module.exports = { uploadImages };
