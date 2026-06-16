


import { StatusCodes } from "http-status-codes";
import { getDocumentMetaService, queryDocumentService } from "../service/rag.service.js";
import { createDocumentFromUploadService } from "../service/rag.service.js";
import { searchInDocumentService } from "../service/rag.service.js";

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
       data: result,
          });
  } catch (error) {
    next(error);
  }
};


export const createDocumentController = async (req, res, next) => {
  try {
    const result = await createDocumentFromUploadService({
      file: req.file,
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded and processed.",
     

    });
  } catch (error) {
    next(error);
  }
};


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

export const searchInDocumentController = async (req, res, next) => {
  try {
    const result = await searchInDocumentService({
      documentId: req.params.documentId,
      query: req.query.query,
      k: req.query.k,
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Ranked chunk excerpts",
      data: result,
    });
  } catch (err) {
    next(err);

  }
};
