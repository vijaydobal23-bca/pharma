const { imagekit, isConfigured } = require('../config/imagekit');

/**
 * Upload an image file (Buffer or Base64 string) to ImageKit
 * If ImageKit is not configured or fails, falls back gracefully.
 */
const uploadImage = async (fileData, fileName = 'upload.jpg', folder = '/pharma') => {
  if (isConfigured && imagekit) {
    try {
      const response = await imagekit.upload({
        file: fileData, // buffer or base64 string
        fileName,
        folder,
      });

      return {
        url: response.url,
        fileId: response.fileId,
        thumbnailUrl: response.thumbnailUrl,
      };
    } catch (error) {
      console.error('ImageKit upload error:', error.message);
      // Fallback if ImageKit error occurs
    }
  }

  // Graceful fallback for environments without live ImageKit keys
  if (typeof fileData === 'string' && fileData.startsWith('data:image')) {
    return {
      url: fileData,
      fileId: `local_${Date.now()}`,
      thumbnailUrl: fileData,
    };
  }

  // Fallback placeholder
  return {
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    fileId: `fallback_${Date.now()}`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80',
  };
};

/**
 * Delete image from ImageKit
 */
const deleteImage = async (fileId) => {
  if (isConfigured && imagekit && fileId && !fileId.startsWith('local_') && !fileId.startsWith('fallback_')) {
    try {
      await imagekit.deleteFile(fileId);
      return true;
    } catch (error) {
      console.warn('Failed to delete image from ImageKit:', error.message);
      return false;
    }
  }
  return true;
};

/**
 * Get ImageKit client auth parameters
 */
const getAuthParams = () => {
  if (isConfigured && imagekit) {
    return imagekit.getAuthenticationParameters();
  }
  return {
    token: 'mock_token',
    expire: Date.now() + 3600,
    signature: 'mock_signature',
  };
};

module.exports = {
  uploadImage,
  deleteImage,
  getAuthParams,
};
