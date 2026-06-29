
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;

-- Create database if it doesn't exist (comment out if already created)
-- CREATE DATABASE IF NOT EXISTS ai_forum_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE ai_forum_db;

-- ============================================================================
-- PART 2: DROP ALL EXISTING TABLES (Clean slate)
-- ============================================================================

-- Drop tables in correct order (child tables first)
DROP TABLE IF EXISTS `document_chunk_vectors`;
DROP TABLE IF EXISTS `document_chunks`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `bookmarks`;
DROP TABLE IF EXISTS `votes`;
DROP TABLE IF EXISTS `question_vectors`;
DROP TABLE IF EXISTS `answers`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `users`;

-- Drop views if they exist
DROP VIEW IF EXISTS `vw_document_stats`;
DROP VIEW IF EXISTS `vw_user_stats`;
DROP VIEW IF EXISTS `vw_answer_stats`;
DROP VIEW IF EXISTS `vw_question_stats`;

-- ============================================================================
-- PART 3: CREATE CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: users
-- Description: User accounts with authentication and profile information
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique user identifier',
    `first_name` VARCHAR(50) NOT NULL COMMENT 'User first name',
    `last_name` VARCHAR(50) NOT NULL COMMENT 'User last name',
    `email` VARCHAR(320) NOT NULL UNIQUE COMMENT 'User email address (unique, lowercase)',
    `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    `avatar_url` VARCHAR(1024) NULL COMMENT 'URL to user profile picture',
    `bio` TEXT NULL COMMENT 'User biography/description',
    `reset_token_hash` VARCHAR(64) NULL DEFAULT NULL COMMENT 'SHA-256 hash of the one-time password reset token',
    `reset_token_expires_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Expiry timestamp of the password reset token (15 min TTL)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last profile update timestamp',
    
    -- Constraints
    CHECK (`email` = LOWER(`email`)),
    
    -- Indexes
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User accounts and authentication data';

-- ----------------------------------------------------------------------------
-- TABLE: questions
-- Description: Forum questions posted by users
-- ----------------------------------------------------------------------------
CREATE TABLE `questions` (
    `question_id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique question identifier',
    `question_hash` CHAR(16) NOT NULL UNIQUE COMMENT 'URL-friendly unique hash for routing',
    `user_id` INT NOT NULL COMMENT 'Question author (FK to users)',
    `title` VARCHAR(255) NOT NULL COMMENT 'Question title/summary',
    `content` TEXT NOT NULL COMMENT 'Full question description',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Question creation timestamp',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last edit timestamp',
    
    -- Constraints
    CHECK (CHAR_LENGTH(`title`) >= 5),
    CHECK (CHAR_LENGTH(`content`) >= 10),
    
    -- Foreign Keys
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    
    -- Indexes
    INDEX `idx_questions_user_id` (`user_id`),
    INDEX `idx_questions_created_at` (`created_at`),
    INDEX `idx_questions_hash` (`question_hash`),
    INDEX `idx_questions_user_created` (`user_id`, `created_at`),
    FULLTEXT KEY `ft_questions_search` (`title`, `content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User-submitted questions';

-- ----------------------------------------------------------------------------
-- TABLE: question_vectors
-- Description: Vector embeddings for semantic question search
-- ----------------------------------------------------------------------------
CREATE TABLE `question_vectors` (
    `vector_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique vector record identifier',
    `question_id` INT NOT NULL COMMENT 'Associated question (FK)',
    `source_text` TEXT NOT NULL COMMENT 'Text that was embedded',
    `embedding` JSON NOT NULL COMMENT 'Vector embedding array from Gemini API',
    `status` ENUM('ready', 'pending', 'failed') DEFAULT 'ready' COMMENT 'Embedding generation status',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Vector creation timestamp',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    -- Foreign Keys
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`question_id`) ON DELETE CASCADE,
    
    -- Indexes
    UNIQUE KEY `uniq_question_vectors_question_id` (`question_id`),
    INDEX `idx_question_vectors_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Vector embeddings for semantic question search';

-- ----------------------------------------------------------------------------
-- TABLE: answers
-- Description: User answers to questions
-- ----------------------------------------------------------------------------
CREATE TABLE `answers` (
    `answer_id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique answer identifier',
    `question_id` INT NOT NULL COMMENT 'Question being answered (FK)',
    `user_id` INT NOT NULL COMMENT 'Answer author (FK to users)',
    `content` TEXT NOT NULL COMMENT 'Answer content/explanation',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Answer creation timestamp',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last edit timestamp',
    
    -- Foreign Keys
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`question_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    
    -- Indexes
    INDEX `idx_answers_question_id` (`question_id`),
    INDEX `idx_answers_user_id` (`user_id`),
    INDEX `idx_answers_created_at` (`created_at`),
    INDEX `idx_answers_question_created` (`question_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User answers to questions';

-- ----------------------------------------------------------------------------
-- TABLE: votes
-- Description: Upvotes and downvotes on questions and answers
-- ----------------------------------------------------------------------------
CREATE TABLE `votes` (
    `vote_id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique vote identifier',
    `user_id` INT NOT NULL COMMENT 'User who voted (FK)',
    `target_type` ENUM('question', 'answer') NOT NULL COMMENT 'Type of content being voted on',
    `target_id` INT NOT NULL COMMENT 'ID of question or answer',
    `vote` TINYINT NOT NULL COMMENT 'Vote value: 1 (upvote) or -1 (downvote)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Vote timestamp',
    
    -- Constraints
    CHECK (`vote` IN (1, -1)),
    
    -- Foreign Keys
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    
    -- Indexes
    UNIQUE KEY `uniq_user_target` (`user_id`, `target_type`, `target_id`),
    INDEX `idx_votes_target` (`target_type`, `target_id`),
    INDEX `idx_votes_user_id` (`user_id`),
    INDEX `idx_votes_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User votes on questions and answers (polymorphic)';

-- ----------------------------------------------------------------------------
-- TABLE: bookmarks
-- Description: User bookmarks for saving favorite questions
-- ----------------------------------------------------------------------------
CREATE TABLE `bookmarks` (
    `bookmark_id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique bookmark identifier',
    `user_id` INT NOT NULL COMMENT 'User who bookmarked (FK)',
    `question_id` INT NOT NULL COMMENT 'Bookmarked question (FK)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Bookmark creation timestamp',
    
    -- Foreign Keys
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`question_id`) ON DELETE CASCADE,
    
    -- Indexes
    UNIQUE KEY `uniq_user_question_bookmark` (`user_id`, `question_id`),
    INDEX `idx_bookmarks_user_id` (`user_id`),
    INDEX `idx_bookmarks_question_id` (`question_id`),
    INDEX `idx_bookmarks_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User bookmarks for saving questions';

-- ============================================================================
-- PART 4: CREATE RAG (KNOWLEDGE BASE) TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: documents
-- Description: User-uploaded PDF documents for RAG system
-- ----------------------------------------------------------------------------
CREATE TABLE `documents` (
    `document_id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique document identifier',
    `user_id` INT NOT NULL COMMENT 'Document owner (FK to users)',
    `title` VARCHAR(512) NOT NULL COMMENT 'Document filename/title',
    `mime_type` VARCHAR(128) NOT NULL DEFAULT 'application/pdf' COMMENT 'File MIME type',
    `storage_path` VARCHAR(1024) NOT NULL COMMENT 'Relative file path on disk',
    `byte_size` BIGINT NOT NULL DEFAULT 0 COMMENT 'File size in bytes',
    `status` ENUM('pending', 'processing', 'ready', 'failed') DEFAULT 'pending' COMMENT 'Processing status',
    `error_message` TEXT NULL COMMENT 'Error message if processing failed',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Upload timestamp',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    -- Foreign Keys
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    
    -- Indexes
    INDEX `idx_documents_user_id` (`user_id`),
    INDEX `idx_documents_user_created` (`user_id`, `created_at`),
    INDEX `idx_documents_status` (`status`),
    INDEX `idx_documents_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User-uploaded PDF documents for RAG system';

-- ----------------------------------------------------------------------------
-- TABLE: document_chunks
-- Description: Text chunks extracted from PDF documents
-- ----------------------------------------------------------------------------
CREATE TABLE `document_chunks` (
    `chunk_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique chunk identifier',
    `document_id` INT NOT NULL COMMENT 'Parent document (FK)',
    `chunk_index` INT NOT NULL COMMENT 'Sequential chunk number within document',
    `content` TEXT NOT NULL COMMENT 'Chunk text content',
    `page_start` INT NULL COMMENT 'Starting page number (optional)',
    `page_end` INT NULL COMMENT 'Ending page number (optional)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Chunk creation timestamp',
    
    -- Foreign Keys
    FOREIGN KEY (`document_id`) REFERENCES `documents`(`document_id`) ON DELETE CASCADE,
    
    -- Indexes
    UNIQUE KEY `uniq_document_chunks_doc_index` (`document_id`, `chunk_index`),
    INDEX `idx_document_chunks_document_id` (`document_id`),
    INDEX `idx_document_chunks_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Text chunks extracted from PDF documents';

-- ----------------------------------------------------------------------------
-- TABLE: document_chunk_vectors
-- Description: Vector embeddings for document chunks (RAG semantic search)
-- ----------------------------------------------------------------------------
CREATE TABLE `document_chunk_vectors` (
    `chunk_vector_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique vector record identifier',
    `chunk_id` BIGINT NOT NULL COMMENT 'Associated chunk (FK)',
    `source_text` TEXT NOT NULL COMMENT 'Text that was embedded',
    `embedding` JSON NOT NULL COMMENT 'Vector embedding array from Gemini API',
    `status` ENUM('ready', 'pending', 'failed') DEFAULT 'ready' COMMENT 'Embedding generation status',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Vector creation timestamp',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    -- Foreign Keys
    FOREIGN KEY (`chunk_id`) REFERENCES `document_chunks`(`chunk_id`) ON DELETE CASCADE,
    
    -- Indexes
    UNIQUE KEY `uniq_chunk_vectors_chunk_id` (`chunk_id`),
    INDEX `idx_chunk_vectors_status` (`status`),
    INDEX `idx_chunk_vectors_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Vector embeddings for document chunks';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
--  INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Additional composite indexes for complex queries
ALTER TABLE questions ADD INDEX `idx_questions_status_created` (`user_id`, `created_at` DESC);
ALTER TABLE answers ADD INDEX `idx_answers_user_created` (`user_id`, `created_at` DESC);
ALTER TABLE votes ADD INDEX `idx_votes_target_vote` (`target_type`, `target_id`, `vote`);
ALTER TABLE bookmarks ADD INDEX `idx_bookmarks_user_created` (`user_id`, `created_at` DESC);
ALTER TABLE documents ADD INDEX `idx_documents_status_created` (`status`, `created_at` DESC);
