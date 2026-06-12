import { StatusCodes } from "http-status-codes";
import { createQuestionWithVectorService } from "../service/question.service.js";

export const createQuestionController = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    const result = await createQuestionWithVectorService({
      userId: req.user.id, // from the authenticated user
      title,
      content,
    });
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Question created successfully",
      data: result.question,
    });
  } catch (error) {
    next(error);
  }
};
