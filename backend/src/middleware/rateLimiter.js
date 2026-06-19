import rateLimit from "express-rate-limit";

// Auth endpoint limiter: 5 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "POST", // Only limit POST requests
});

// AI endpoint limiter: 20 requests per minute per user
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: "Too many AI requests, please try again later.",
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id ? `user-${req.user.id}` : req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
});
