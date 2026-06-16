import express from "express";

import authRoutes from "./auth/routes/auth.routes.js";
import questionRoutes from "./questions/routes/question.routes.js";
import answerRoutes from "./answer/routes/answer.route.js";
import ragRoutes from "./rag/routes/rag.routes.js";

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

/**
 * RAG Documents Routes
 */
mainRouter.use("/rag/documents", ragRoutes);
mainRouter.use("/rag", ragRoutes);
