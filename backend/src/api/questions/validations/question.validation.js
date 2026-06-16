import { body, query, param } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

/**
 * Create Question Validation
 */
export const createQuestionValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 5, max: 255 })
    .withMessage("Title must be between 5 and 255 characters"),

  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isString()
    .withMessage("Content must be a string")
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters long"),

  validationErrorHandler,
];

/**
 * Get Questions Validation
 */
export const getQuestionsValidation = [
  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim(),

  query("mine")
    .optional()
    .isIn(["true", "false"])
    .withMessage("Mine must be a boolean (true/false)"),

  validationErrorHandler,
];

/**
 * Get Single Question Validation
 */
export const getSingleQuestionValidation = [
  param("questionHash")
    .matches(/^[a-f0-9]{16}$/)
    .withMessage(
      "Question hash must be a 16-character lowercase hex string"
    ),

  validationErrorHandler,
];

/**
 * Semantic Search Validation
 */
export const validateSearchQuestions = [
  query("query")
    .notEmpty()
    .withMessage("Query is required")
    .isString()
    .withMessage("Query must be a string")
    .isLength({ min: 5 })
    .withMessage("Query must be at least 5 characters long")
    .trim(),

  query("k")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("k must be an integer between 1 and 20")
    .toInt(),

  query("threshold")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("threshold must be a float between 0 and 1")
    .toFloat(),

  validationErrorHandler,
];

/**
 * Similar Questions Validation
 */
export const validateSimilarQuestions = [
  param("questionHash")
    .matches(/^[a-f0-9]{16}$/)
    .withMessage(
      "Question hash must be a 16-character lowercase hex string"
    ),

  query("k")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("k must be an integer between 1 and 20")
    .toInt(),

  query("threshold")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("threshold must be a float between 0 and 1")
    .toFloat(),

  validationErrorHandler,
];