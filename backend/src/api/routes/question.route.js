import express from "express";
import { evaluateAnswerFit } from "../controller/question.controller.js";
import { authenticateUser } from "../../middleware/authentication.js";

const questionRouter = express.Router();
/**
 * POST /api/questions/:questionHash/answer-fit
 * Evaluates how well an answer addresses a question
 *
 * Protected route - requires JWT token
 *
 * Request body:
 * {
 *   "answerText": "The user's draft answer..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "fit_score": 7,
 *     "strengths": "...",
 *     "improvements": "...",
 *     "feedback": "...",
 *     "question_title": "..."
 *   }
 * }
 */
questionRouter.post(
  "/:questionHash/answer-fit",
  authenticateUser,
  evaluateAnswerFit,
);

export default questionRouter;
