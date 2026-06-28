import { authLimiter } from '../../../middleware/rateLimiter.js';
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
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
import { updateProfileService } from '../service/auth.service.js';

const router = express.Router();

// ── Cloudinary configuration ─────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer → Cloudinary storage ───────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'forum-avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
    // use user id + timestamp as the public_id so old uploads are overwritten
    public_id: (req) => `avatar_${req.user.id || req.user.user_id}_${Date.now()}`,
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * @route POST /api/auth/register
 * @desc  Register a new user
 * @access Public
 */
router.post('/register', registerValidation, registerController);

/**
 * @route POST /api/auth/login
 * @desc  Authenticate user and get token
 * @access Public
 */
router.post('/login', authLimiter, loginValidation, loginController);

/**
 * @route GET /api/auth/profile
 * @desc  Get user profile and stats
 * @access Private
 */
router.get('/profile', authenticateUser, getProfileController);

/**
 * @route PUT /api/auth/profile
 * @desc  Update user profile details
 * @access Private
 */
router.put('/profile', authenticateUser, updateProfileController);

/**
 * @route PUT /api/auth/password
 * @desc  Change user password
 * @access Private
 */
router.put('/password', authenticateUser, changePasswordController);

/**
 * @route POST /api/auth/avatar
 * @desc  Upload user avatar to Cloudinary and persist URL in DB
 * @access Private
 */
router.post(
  '/avatar',
  authenticateUser,
  upload.single('avatar'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      // Cloudinary returns the secure URL on req.file.path (multer-storage-cloudinary)
      const avatarUrl = req.file.path;

      // Persist immediately so the user doesn't have to click "Save Changes"
      const userId = req.user.user_id || req.user.id;
      await updateProfileService(userId, { avatarUrl });

      res.json({ success: true, avatarUrl });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
