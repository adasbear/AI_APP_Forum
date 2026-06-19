import express from "express";

import {
  createQuestionController,
  getQuestionsController,
  getSingleQuestionController,
  searchQuestionsSemanticController,
  getSimilarQuestionsController,
  generateQuestionDraftCoachController,
  evaluateAnswerFit,
  updateQuestionController,
  deleteQuestionController,
} from "../controller/question.controller.js";

import {
  createQuestionValidation,
  getQuestionsValidation,
  getSingleQuestionValidation,
  validateSearchQuestions,
  validateSimilarQuestions,
  generateQuestionDraftCoachValidation,
  updateQuestionValidation,
  deleteQuestionValidation,
} from "../validations/question.validation.js";

import { authenticateUser } from "../../../middleware/authentication.js";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";
import { aiLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

/**
 * @route POST /api/questions/draft-coach
 * @desc Get AI coaching feedback on question draft
 * @access Private
 */
router.post(
  '/draft-coach',
  authenticateUser,
  aiLimiter,
  generateQuestionDraftCoachValidation,
  generateQuestionDraftCoachController,
);

/**
 * @route GET /api/questions/search
 * @desc Semantic search for similar questions based on text input
 * @access Private
 * @query text - The input text to search for similar questions
 * @query limit - Optional limit on number of results (default: 5)
 */
router.get(
  "/search",
  authenticateUser,
  validateSearchQuestions,
  searchQuestionsSemanticController
);

/**
 * @route POST /api/questions/:questionHash/answer-fit
 * @desc Evaluates how well an answer addresses a question using AI
 * @access Private
 */
router.post(
  "/:questionHash/answer-fit",
  authenticateUser,
  aiLimiter,
  evaluateAnswerFit,
);

/**
 * @route POST /api/questions
 * @desc Create a new question and generate its vector embedding
 * @access Private
 */
router.post(
  "/",
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);

/**
 * @route GET /api/questions
 * @desc Fetch all questions with optional search and filter
 * @access Private
 * @query search - Optional keyword search for title or content
 * @query mine - Optional boolean to filter by current user's questions
 */
router.get(
  "/",
  authenticateUser,
  getQuestionsValidation,
  getQuestionsController,
);

/**
 * @route GET /api/questions/:questionHash/similar
 * @desc Get similar questions based on vector embeddings
 * @access Private
 */
router.get(
  '/:questionHash/similar',
  validateSimilarQuestions,
  validationErrorHandler,
  getSimilarQuestionsController
);

/**
 * @route GET /api/questions/:questionHash
 * @desc Fetch a specific question and all its answers
 * @access Private
 * @param questionHash - 16-character hex string
 */
router.get(
  "/:questionHash",
  authenticateUser,
  getSingleQuestionValidation,
  getSingleQuestionController,
);

/**
 * @route PUT /api/questions/:questionHash
 * @desc Update a question (author only)
 * @access Private
 */
router.put(
  "/:questionHash",
  authenticateUser,
  updateQuestionValidation,
  updateQuestionController
);

/**
 * @route DELETE /api/questions/:questionHash
 * @desc Delete a question (author only)
 * @access Private
 */
router.delete(
  "/:questionHash",
  authenticateUser,
  deleteQuestionValidation,
  deleteQuestionController
);

export default router;
