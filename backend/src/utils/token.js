import crypto from 'crypto';

/**
 * Generates a cryptographically secure random token.
 *
 * @returns {{ rawToken: string, tokenHash: string }}
 *   rawToken  – sent to the user (URL-safe hex string)
 *   tokenHash – SHA-256 digest stored in the database
 */
export function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex'); // 64-char hex
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Hashes a raw token using SHA-256.
 *
 * @param {string} rawToken
 * @returns {string} hex digest
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
