import express from "express";

import authRoutes from "./auth/routes/auth.routes.js";
import questionRoutes from "./questions/routes/question.routes.js";
import answerRoutes from "./answers/routes/answer.routes.js";

export const mainRouter = express.Router();

/**
 * Authentication Routes
 */
mainRouter.use("/auth", authRoutes);

/**
 * Question Routes
 */
mainRouter.use("/questions", questionRoutes);

/**
 * Answer Routes
 */
mainRouter.use("/answers", answerRoutes);