import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  registerController,
  loginController,
  getProfileController,
  updateProfileController,
  changePasswordController,
} from '../controller/auth.controller.js';
import {
  registerValidation,
  loginValidation,
} from '../validations/auth.validation.js';
import { authenticateUser } from '../../../middleware/authentication.js';

const router = express.Router();

// Multer setup for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/avatars';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', registerValidation, registerController);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', loginValidation, loginController);

/**
 * @route GET /api/auth/profile
 * @desc Get user profile and stats
 * @access Private
 */
router.get('/profile', authenticateUser, getProfileController);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile details
 * @access Private
 */
router.put('/profile', authenticateUser, updateProfileController);

/**
 * @route PUT /api/auth/password
 * @desc Change user password
 * @access Private
 */
router.put('/password', authenticateUser, changePasswordController);

/**
 * @route POST /api/auth/avatar
 * @desc Upload user avatar
 * @access Private
 */
router.post('/avatar', authenticateUser, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  // Construct the URL path (assuming express static is setup for 'uploads')
  // Wait, does the backend serve /uploads? I need to check index.js
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  res.json({ success: true, avatarUrl });
});

export default router;
