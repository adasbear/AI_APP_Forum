import express from 'express';
import authRoutes from './auth/routes/auth.routes.js';
import questionRouter from './routes/question.route.js';
import questionRoutes from "./question/routes/question.routes.js";

export const mainRouter = express.Router();

// Authentication routes
mainRouter.use("/auth", authRoutes);

// Question routes
mainRouter.use("/questions", questionRoutes);
