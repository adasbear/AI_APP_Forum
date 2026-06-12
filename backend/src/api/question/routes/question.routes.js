import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { createQuestionValidation } from "../validations/question.validation.js";
import { createQuestionController } from "../controller/question.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);

export default router;
