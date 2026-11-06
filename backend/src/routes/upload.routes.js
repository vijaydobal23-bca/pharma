const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage, getAuthParams, isConfigured } = require('../services/imagekit.service');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Memory storage for multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

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
 * Direct file or base64 upload to ImageKit
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    let fileData;
    let fileName = 'upload.jpg';
    const folder = req.body.folder || '/pharma';

    if (req.file) {
      // Buffer from multer
      fileData = req.file.buffer;
      fileName = req.file.originalname || `file_${Date.now()}.jpg`;
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

