const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload.middleware');
const { uploadImage, getAuthParams, isConfigured } = require('../services/imagekit.service');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

/**
 * Get ImageKit status & client authentication parameters
 */
router.get('/auth', (req, res) => {
  const authParams = getAuthParams();
  res.status(200).json({
    success: true,
    isConfigured,
    data: authParams,
  });
});

/**
 * Direct file or base64 upload to ImageKit via Multer
 */
router.post('/', upload.any(), async (req, res) => {
  try {
    let fileData;
    let fileName = 'upload.jpg';
    const folder = req.body.folder || '/pharma';

    const uploadedFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

    if (uploadedFile) {
      // Buffer from multer
      fileData = uploadedFile.buffer;
      fileName = uploadedFile.originalname || `file_${Date.now()}.jpg`;
    } else if (req.body.image) {
      // Base64 string from JSON body
      fileData = req.body.image;
      fileName = req.body.fileName || `img_${Date.now()}.jpg`;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No file or image payload provided',
      });
    }

    const result = await uploadImage(fileData, fileName, folder);

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully to ImageKit',
      data: result,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Image upload failed',
    });
  }
});

module.exports = router;

