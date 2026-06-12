import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { createQuestionValidation, generateQuestionDraftCoachValidation } from "../validations/question.validation.js";
import { createQuestionController,  generateQuestionDraftCoachController } from "../controller/question.controller.js";

const router = express.Router();

router.post(
  '/draft-coach',
  authenticateUser,
  generateQuestionDraftCoachValidation,
  generateQuestionDraftCoachController,
);

router.post(
  "/",
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);

export default router;
