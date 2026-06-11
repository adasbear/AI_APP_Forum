import { body, query, param } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

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

export const getQuestionsValidation = [
  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim(),
  query("mine")
    .optional()
    .isBoolean({ strict: true })
    .withMessage("Mine must be a boolean"),
  validationErrorHandler,
];

export const getSingleQuestionValidation = [
  param("questionHash")
    .matches(/^[a-f0-9]{16}$/)
    .withMessage("Question hash must be a 16-character lowercase hex string"),
  validationErrorHandler,
];
