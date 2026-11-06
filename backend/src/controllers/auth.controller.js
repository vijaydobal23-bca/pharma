const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const {
  generateAccessToken,
  generateRefreshToken,
  getCookieOptions,
} = require('../utils/token.utils');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'user',
    });

  
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

  
    res.cookie('refreshToken', refreshToken, getCookieOptions());

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

/**
 * @desc    Login user & obtain access/refresh tokens
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

 
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }


    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }


    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

 
    user.refreshToken = refreshToken;
    await user.save();

    
    res.cookie('refreshToken', refreshToken, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public (Requires valid refresh token)
 */
const refreshAccessToken = async (req, res) => {
  try {
    
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    
    let decoded;
    try {
      decoded = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
    } catch (err) {
      return res.status(403).json({
        success: false,
        message:
          err.name === 'TokenExpiredError'
            ? 'Refresh token has expired, please log in again'
            : 'Invalid refresh token',
      });
    }

   
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.refreshToken !== incomingRefreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Refresh token is invalid or has been revoked',
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

 
    user.refreshToken = newRefreshToken;
    await user.save();

 
    res.cookie('refreshToken', newRefreshToken, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error('Refresh Token Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

/**
 * @desc    Logout user & invalidate refresh token
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (userId) {
      
      await User.findByIdAndUpdate(userId, { $set: { refreshToken: null } });
    } else {
      
      const incomingRefreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken;
      if (incomingRefreshToken) {
        await User.findOneAndUpdate(
          { refreshToken: incomingRefreshToken },
          { $set: { refreshToken: null } }
        );
      }
    }


    res.clearCookie('refreshToken', getCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile,
};

