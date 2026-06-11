import { body } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

export const generateQuestionDraftCoachValidation = [
  body('title')
    .optional()
    .isString()
    .withMessage('Title must be a string'),
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isString()
    .withMessage('Content must be a string'),

  validationErrorHandler,
];
