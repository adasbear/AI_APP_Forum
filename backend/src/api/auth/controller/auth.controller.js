import { StatusCodes } from 'http-status-codes';
import { registerService, loginService, getProfileService, updateProfileService, changePasswordService } from '../service/auth.service.js';

/**
 * Handles user registration requests.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const registerController = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const newUser = await registerService({
      firstName,
      lastName,
      email,
      password,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'User registered successfully.',
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles user login requests.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const authResult = await loginService({ email, password });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Login successful.',
      user: authResult.user,
      token: authResult.token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets the current user's profile.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 */
export const getProfileController = async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id;
    const profile = await getProfileService(userId);
    res.status(StatusCodes.OK).json({ success: true, profile });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates the current user's profile.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 */
export const updateProfileController = async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id;
    const updatedProfile = await updateProfileService(userId, req.body);
    res.status(StatusCodes.OK).json({ success: true, profile: updatedProfile });
  } catch (error) {
    next(error);
  }
};

/**
 * Changes the current user's password.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 */
export const changePasswordController = async (req, res, next) => {
  try {
    const userId = req.user.user_id || req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'currentPassword and newPassword are required.' });
    }

    await changePasswordService(userId, currentPassword, newPassword);
    res.status(StatusCodes.OK).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

