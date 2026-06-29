import { StatusCodes } from "http-status-codes";
import {
  listDocumentsForUserService,
  getDocumentMetaService,
  assertOwnedDocument,
  createDocumentFromUploadService,
  searchInDocumentService,
  queryDocumentService,
  deleteDocumentService,
} from "../service/rag.service.js";

/**
 * GET /api/rag/documents
 */
export const listDocumentsController = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const documents = await listDocumentsForUserService(userId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Documents fetched successfully.",
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rag/documents/:documentId
 */
export const getDocumentMetaController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.id;
    const data = await getDocumentMetaService(documentId, userId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Document fetched successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/rag/documents
 */
export const createDocumentController = async (req, res, next) => {
  try {
    const result = await createDocumentFromUploadService({
      file: req.file,
      userId: req.user.id,
    });
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Document uploaded and processed.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rag/documents/:documentId/file
 *
 * Proxies the PDF through the backend by fetching it from Cloudinary
 * server-side with HTTP Basic Auth (api_key:api_secret).
 * This works for both private and public assets — the browser never
 * touches Cloudinary directly so there are no 401s.
 */
export const getDocumentFileController = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { documentId } = req.params;
    const document = await assertOwnedDocument(documentId, userId);

    if (!document.storage_path) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "No file URL found for this document",
      });
    }

    const storagePath = document.storage_path;

    // Build HTTP Basic Auth header from Cloudinary credentials
    const apiKey    = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error("CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET not set");
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Storage credentials not configured",
      });
    }

    const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    // Fetch the PDF from Cloudinary server-side with credentials
    const cloudRes = await fetch(storagePath, {
      headers: { Authorization: `Basic ${basicAuth}` },
    });

    if (!cloudRes.ok) {
      console.error(`Cloudinary fetch failed: ${cloudRes.status} ${cloudRes.statusText} for ${storagePath}`);
      return res.status(StatusCodes.BAD_GATEWAY).json({
        success: false,
        message: `Failed to retrieve PDF from storage (${cloudRes.status})`,
      });
    }

    const pdfBuffer = Buffer.from(await cloudRes.arrayBuffer());
    const filename = (document.title || "document.pdf").replace(/[^\w\s.-]/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("getDocumentFileController error:", error?.message || error);
    next(error);
  }
};

/**
 * POST /api/rag/documents/:documentId/query
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
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rag/documents/:documentId/search
 */
export const searchInDocumentController = async (req, res, next) => {
  try {
    const result = await searchInDocumentService({
      documentId: req.params.documentId,
      query: req.query.query,
      k: req.query.k,
      userId: req.user.id,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Ranked chunk excerpts",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/rag/documents/:documentId
 */
export const deleteDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    const result = await deleteDocumentService(Number(documentId), userId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Document deleted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
