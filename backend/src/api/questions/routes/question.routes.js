import express from "express";

import {
  createQuestionController,
  getQuestionsController,
  getSingleQuestionController,
  searchQuestionsSemanticController,
  getSimilarQuestionsController,
} from "../controller/question.controller.js";

import {
  createQuestionValidation,
  getQuestionsValidation,
  getSingleQuestionValidation,
  validateSearchQuestions,
  validateSimilarQuestions,
} from "../validations/question.validation.js";

import { authenticateUser } from "../../../middleware/authentication.js";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

const router = express.Router();

/**
 * @route get /api/questions/search
 * @desc Semantic search for similar questions based on text input
 * @access Private
 * @query text - The input text to search for similar questions
 * @query limit - Optional limit on number of results (default: 5)
 */
// router.get(
//   "/search",
//   authenticateUser,
//   searchQuestionSemanticValidation,
//   searchQuestionSemanticController,
// );



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
 * @route GET /api/questions/:questionHash
 * @desc Fetch a specific question and all its answers
 * @access Private
 * @param questionHash - 16-character hex string
 */
router.get(
  '/:questionHash/similar',
  validateSimilarQuestions,
  validationErrorHandler,
  getSimilarQuestionsController
  );

router.get(
  "/:questionHash",
  authenticateUser,
  getSingleQuestionValidation,
  getSingleQuestionController,
);

export default router;
