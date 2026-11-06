const ImageKit = require('imagekit');

const publicKey = (process.env.IMAGEKIT_PUBLIC_KEY || '').trim();
const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
const urlEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_ENDPOINT || '').trim();

const isConfigured = Boolean(publicKey && privateKey && urlEndpoint);

let imagekit = null;

if (isConfigured) {
  try {
    imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
    console.log('✓ ImageKit SDK successfully initialized for:', urlEndpoint);
  } catch (error) {
    console.warn('ImageKit initialization warning:', error.message);
  }
}

module.exports = {
  imagekit,
  isConfigured,
  publicKey,
  urlEndpoint,
};

