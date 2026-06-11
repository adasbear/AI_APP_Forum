import express from 'express';
import { generateQuestionDraftCoachController } from '../controller/question.controller.js';
import { generateQuestionDraftCoachValidation } from '../validations/question.validation.js';
import { authenticateUser } from '../../../middleware/authentication.js';

const router = express.Router();

/**
 * @route POST /api/questions/draft-coach
 * @desc Get AI feedback and tips on a question draft
 * @access Protected
 */
router.post(
  '/draft-coach',
  authenticateUser,
  generateQuestionDraftCoachValidation,
  generateQuestionDraftCoachController,
);

export default router;
