import { body, param, query } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

export const createQuestionValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 5, max: 255 })
    .withMessage("Title must be at least 5 characters long"),
  body("content")
    .notEmpty()
    .withMessage(" question Content is required")
    .isString()
    .withMessage(" question Content must be a string")
    .isLength({ min: 10 })
    .withMessage(" question Content must be at least 10 characters long"),
  validationErrorHandler,
];
