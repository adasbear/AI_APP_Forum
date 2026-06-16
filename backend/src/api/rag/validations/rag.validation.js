import Joi from "joi";
import { body, param } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

/**
 * Upload Validation
 */
export function validateUploadedDocument(file) {
  if (!file) {
    throw new Error("PDF file is required");
  }
  if (file.mimetype !== "application/pdf") {
    throw new Error("Only PDF files are allowed");
  }
  return true;
}

/**
 * Search Validation Schema
 */
export const searchDocumentSchema = Joi.object({
  documentId: Joi.number().integer().required(),
  query: Joi.string().min(1).required(),
  k: Joi.number().integer().min(1).max(20).optional(),
});

/**
 * Validate Document ID Param
 */
export const documentIdParamValidation = [
  param("documentId")
    .isInt({ min: 1 })
    .withMessage("Document ID must be a positive integer")
    .toInt(),
  validationErrorHandler,
];

/**
 * Validate Query Request
 */
export const queryDocumentValidation = [
  param("documentId")
    .isInt({ min: 1 })
    .withMessage("Document ID must be a positive integer")
    .toInt(),
  body("query")
    .notEmpty()
    .withMessage("Query is required")
    .isString()
    .withMessage("Query must be a string")
    .trim(),
  validationErrorHandler,
];