const { imagekit, isConfigured, publicKey, urlEndpoint } = require('../config/imagekit');

/**
 * Upload image to ImageKit CDN
 * Accepts base64 data string, binary Buffer, or remote URL
 */
const uploadImage = async (fileData, fileName = 'upload.jpg', folder = '/pharma') => {
  if (!fileData) {
    return {
      url: '',
      fileId: '',
      thumbnailUrl: '',
    };
  }

  // If already a remote CDN / HTTP URL and not base64, preserve it
  if (typeof fileData === 'string' && (fileData.startsWith('http://') || fileData.startsWith('https://'))) {
    return {
      url: fileData,
      fileId: null,
      thumbnailUrl: fileData,
    };
  }

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
        thumbnailUrl: response.thumbnailUrl || response.url,
      };
    } catch (error) {
      console.error('ImageKit upload error:', error.message);
    }
  }

  // Graceful fallback for local environments if ImageKit throws network error
  if (typeof fileData === 'string' && fileData.startsWith('data:image')) {
    return {
      url: fileData,
      fileId: `local_${Date.now()}`,
      thumbnailUrl: fileData,
    };
  }

  // Default fallback medical placeholder
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
    const auth = imagekit.getAuthenticationParameters();
    return {
      ...auth,
      publicKey,
      urlEndpoint,
    };
  }
  return {
    token: 'mock_token',
    expire: Date.now() + 3600,
    signature: 'mock_signature',
    publicKey: '',
    urlEndpoint: '',
  };
};

module.exports = {
  uploadImage,
  deleteImage,
  getAuthParams,
  isConfigured,
};

