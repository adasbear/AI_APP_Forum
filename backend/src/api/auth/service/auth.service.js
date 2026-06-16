import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { safeExecute } from "../../../../db/config.js";
import {
  BadRequestError,
  UnauthenticatedError,
} from "../../../utils/errors/index.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const normalizeEmail = (email) => email.trim().toLowerCase();

/**
 * Checks if a user exists by email.
 *
 * @param {string} email - The email to check.
 * @returns {Promise<boolean>} True if the user exists, false otherwise.
 */
export const checkUserExists = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const sql = "SELECT user_id FROM users WHERE email = ? LIMIT 1";
  const rows = await safeExecute(sql, [normalizedEmail]);
  return rows.length > 0;
};

/**
 * Registers a new user in the database.
 *
 * @param {Object} userData - The user data.
 * @param {string} userData.firstName - The first name.
 * @param {string} userData.lastName - The last name.
 * @param {string} userData.email - The email address.
 * @param {string} userData.password - The plain text password.
 * @returns {Promise<Object>} The created user object (without password).
 */
export const registerService = async ({
  firstName,
  lastName,
  email,
  password,
}) => {
  const normalizedEmail = normalizeEmail(email);
  const userExists = await checkUserExists(normalizedEmail);
  if (userExists) {
    throw new BadRequestError("User already exists with this email.");
  }

  // every time we call bcrypt.genSalt, it generates a new random salt string.
  const salt = await bcrypt.genSalt(10); // generates a unique random salt each call
  const hashedPassword = await bcrypt.hash(password, salt);
  const sql =
    "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)";
  let result;
  try {
    result = await safeExecute(sql, [
      firstName,
      lastName,
      normalizedEmail,
      hashedPassword,
    ]);
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      throw new BadRequestError("User already exists with this email.");
    }
    throw error;
  }

  return {
    id: result.insertId,
    firstName,
    lastName,
    email: normalizedEmail,
  };
};

/**
 * Authenticates a user and generates a JWT token.
 *
 * @param {Object} credentials - The login credentials.
 * @param {string} credentials.email - The user's email.
 * @param {string} credentials.password - The user's plain text password.
 * @returns {Promise<Object>} An object containing the user and token.
 * @throws {UnauthenticatedError} If authentication fails.
 */
export const loginService = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const sql =
    "SELECT user_id, first_name, last_name, email, password_hash, avatar_url FROM users WHERE email = ? LIMIT 1";
  const rows = await safeExecute(sql, [normalizedEmail]);

  if (rows.length === 0) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  const payload = {
    id: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    user: {
      id: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      avatar_url: user.avatar_url,
    },
    token,
  };
};

/**
 * Gets a user's profile including stats.
 *
 * @param {number} userId - The user ID.
 * @returns {Promise<Object>} The user profile data.
 */
export const getProfileService = async (userId) => {
  const sql = `
    SELECT 
      u.user_id as id, u.first_name as firstName, u.last_name as lastName, u.email, u.avatar_url as avatarUrl, u.bio,
      (SELECT COUNT(*) FROM questions q WHERE q.user_id = u.user_id) AS questionsAsked,
      (SELECT COUNT(*) FROM answers a WHERE a.user_id = u.user_id) AS answersGiven
    FROM users u
    WHERE u.user_id = ?
  `;
  const rows = await safeExecute(sql, [userId]);
  if (rows.length === 0) {
    throw new UnauthenticatedError("User not found");
  }
  return rows[0];
};

/**
 * Updates a user's profile details.
 *
 * @param {number} userId - The user ID.
 * @param {Object} updateData - Data to update.
 * @returns {Promise<Object>} The updated profile.
 */
export const updateProfileService = async (userId, { firstName, lastName, bio, avatarUrl }) => {
  const sql = `
    UPDATE users 
    SET first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url)
    WHERE user_id = ?
  `;
  await safeExecute(sql, [
    firstName !== undefined ? firstName : null,
    lastName !== undefined ? lastName : null,
    bio !== undefined ? bio : null,
    avatarUrl !== undefined ? avatarUrl : null,
    userId
  ]);
  return getProfileService(userId);
};

/**
 * Changes a user's password.
 *
 * @param {number} userId - The user ID.
 * @param {string} currentPassword - The current password.
 * @param {string} newPassword - The new password.
 * @returns {Promise<void>}
 */
export const changePasswordService = async (userId, currentPassword, newPassword) => {
  const sql = "SELECT password_hash FROM users WHERE user_id = ? LIMIT 1";
  const rows = await safeExecute(sql, [userId]);
  
  if (rows.length === 0) {
    throw new UnauthenticatedError("User not found");
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isMatch) {
    throw new BadRequestError("Incorrect current password");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedNewPassword = await bcrypt.hash(newPassword, salt);

  const updateSql = "UPDATE users SET password_hash = ? WHERE user_id = ?";
  await safeExecute(updateSql, [hashedNewPassword, userId]);
};
