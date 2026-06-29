import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Auth endpoint limiter: 5 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "POST", // Only limit POST requests
});

// Password reset limiter: 3 requests per 15 minutes per IP
// Stricter than login limiter to prevent email spam / token brute-force
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: "Too many password reset requests. Please wait 15 minutes and try again.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "POST",
});

// AI endpoint limiter: 20 requests per minute per user
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: "Too many AI requests, please try again later.",
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP with proper IPv6 handling
    return req.user?.id ? `user-${req.user.id}` : ipKeyGenerator(req);
  },
  standardHeaders: true,
  legacyHeaders: false,
});
