import { StatusCodes } from "http-status-codes";
import {
  createQuestionWithVectorService,
  getQuestionsService,
  getSingleQuestionService,
      getSimilarQuestionsService,
} from "../service/question.service.js";

                                    
  export const searchQuestionsSemanticController = async (req, res, next) => {
  try {
    const { query } = req.query;
    const k = req.query.k ? parseInt(req.query.k, 10) : 5;
    const threshold = req.query.threshold ? parseFloat(req.query.threshold) : 0.75;

    const data = await searchQuestionsSemanticService(query, k, threshold);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Semantic search completed successfully',
      data,
      meta: {
        total: data.length,
        k,
        threshold,
        query,
        questionHash: null
      }
          });
  } catch (error) {
    next(error);
  }
};
      
export const createQuestionController = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const userId = req.user?.id;

    const question = await createQuestionWithVectorService({
      userId,
      title,
      content,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Question posted successfully.",
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/*
* Handles listing  questions with optional search filtering. Max 100 records
@param {import("express").Request} req - The request object 
@param {import("express").Response} res - The response object
@param {import("express").NextFunction} next - The next middleware function
@return {Promise<void>} - A promise that resolves when the response is sent 
*/

export const getQuestionsController = async (req, res, next) => {
  try {
    const { search, mine } = req.query;
    const userId = req.user?.id;

    const result = await getQuestionsService({
      search: search || null,
      mine: mine === "true",
      userId,
    });

    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSimilarQuestionsController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const k = req.query.k ? parseInt(req.query.k, 10) : 5;
    const threshold = req.query.threshold ? parseFloat(req.query.threshold) : 0.75;

    const data = await getSimilarQuestionsService(questionHash, k, threshold);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Similar questions fetched successfully',
      data,
      meta: {
        total: data.length,
        k,
        threshold,
        query: null,
        questionHash
      }
    });
