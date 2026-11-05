const jwt = require('jsonwebtoken');

/**
 * Generate Access Token
 * Payload includes user id, email, and role.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    }
  );
};

/**
 * Generate Refresh Token
 * Payload includes user id.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
    }
  );
};

/**
 * Cookie options for setting refresh token securely
 */
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true, // Prevents client-side JS from reading the cookie (mitigating XSS)
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  getCookieOptions,
};

