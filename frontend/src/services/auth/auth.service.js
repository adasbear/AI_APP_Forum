import { apiClient } from '../core/api.client.js';

/**
 * Registers a new user.
 * @param {Object} userData - User details for registration.
 */
async function register(userData) {
  try {
    const response = await apiClient.post('/api/auth/register', userData);
    return { user: response.data.user };
  } catch (error) {
    throw handleAuthError(error);
  }
}

/**
 * Logs in an existing user and stores their session in localStorage.
 * @param {Object} credentials - User login credentials.
 */
async function login(credentials) {
  try {
    const response = await apiClient.post('/api/auth/login', credentials);
    const { user, token } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    return { user, token };
  } catch (error) {
    throw handleAuthError(error);
  }
}

/**
 * Logs out the current user by clearing localStorage.
 */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Retrieves the stored JWT token from localStorage.
 */
function getStoredToken() {
  return localStorage.getItem('token');
}

/**
 * Retrieves the stored user object from localStorage.
 */
function getStoredUser() {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch (error) {
    // If JSON parsing fails, clear invalid data
    localStorage.removeItem('user');
    return null;
  }
}

/**
 * Checks if the user is currently authenticated based on local storage.
 */
function isAuthenticated() {
  return !!getStoredToken();
}

/**
 * Centralized error handler for auth service requests.
 */
function handleAuthError(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timed out. Please try again.');
    }
    return new Error(
      'Unable to connect to server. Please check your internet connection.',
    );
  }

  const status = error.response.status;
  const backendMessage =
    error.response.data?.msg || error.response.data?.message;

  switch (status) {
    case 400:
      return new Error(backendMessage || 'Invalid input data.');
    case 401:
      return new Error(backendMessage || 'Invalid email or password.');
    case 500:
      return new Error(
        'Something went wrong on our end. Please try again later.',
      );
    default:
      return new Error(backendMessage || 'An unexpected error occurred.');
  }
}

/**
 * Gets the current user's profile.
 */
async function getProfile() {
  try {
    const response = await apiClient.get('/api/auth/profile');
    return response.data.profile;
  } catch (error) {
    throw handleAuthError(error);
  }
}

/**
 * Updates the user profile.
 */
async function updateProfile(data) {
  try {
    const response = await apiClient.put('/api/auth/profile', data);
    return response.data.profile;
  } catch (error) {
    throw handleAuthError(error);
  }
}

/**
 * Uploads a new avatar image.
 */
async function uploadAvatar(file) {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await apiClient.post('/api/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.avatarUrl;
  } catch (error) {
    throw handleAuthError(error);
  }
}

/**
 * Changes the user's password.
 */
async function changePassword(data) {
  try {
    const response = await apiClient.put('/api/auth/password', data);
    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
}

/**
 * Sends a forgot-password email request.
 * Always succeeds from the server side (anti-enumeration).
 *
 * @param {string} email
 */
async function forgotPassword(email) {
  try {
    const response = await apiClient.post('/api/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
}

/**
 * Resets the user's password using a token from the email link.
 *
 * @param {{ token: string, newPassword: string }} data
 */
async function resetPassword(data) {
  try {
    const response = await apiClient.post('/api/auth/reset-password', data);
    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
}

/**
 * Service for handling auth-related requests.
 */
export const authService = {
  register,
  login,
  logout,
  getStoredToken,
  getStoredUser,
  isAuthenticated,
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  forgotPassword,
  resetPassword,
};
