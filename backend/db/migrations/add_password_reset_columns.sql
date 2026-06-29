-- Migration: Add password reset token columns to users table
-- Run once: mysql -u <user> -p <database> < db/migrations/add_password_reset_columns.sql

ALTER TABLE `users`
  ADD COLUMN `reset_token_hash` VARCHAR(64) NULL DEFAULT NULL
    COMMENT 'SHA-256 hash of the one-time password reset token',
  ADD COLUMN `reset_token_expires_at` TIMESTAMP NULL DEFAULT NULL
    COMMENT 'Expiry timestamp of the password reset token (15 min TTL)',
  ADD INDEX `idx_users_reset_token_hash` (`reset_token_hash`);
