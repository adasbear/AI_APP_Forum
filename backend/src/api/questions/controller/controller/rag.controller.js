import { StatusCodes } from "http-status-codes";
import { getDocumentMetaService, queryDocumentService } from "../service/rag.service.js";

/**
 * Controller for getting document metadata
 */
export const getDocumentMetaController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.id;

    const data = await getDocumentMetaService(documentId, userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Document fetched successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for querying a document
 */
export const queryDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query } = req.body;
    const userId = req.user?.id;

    const data = await queryDocumentService(documentId, userId, query);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Answer and citations",
      data
    });
  } catch (error) {
    next(error);
  }
};
