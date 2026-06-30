import { StatusCodes } from "http-status-codes";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { downloadCloudinaryRawPdf } from "../../../middleware/rag.upload.config.js";
import {
  listDocumentsForUserService,
  getDocumentMetaService,
  assertOwnedDocument,
  createDocumentFromUploadService,
  searchInDocumentService,
  queryDocumentService,
  deleteDocumentService,
} from "../service/rag.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEBUG_LOG = path.resolve(__dirname, "../../../../../debug-ec5947.log");

function agentDebugLog(payload) {
  // #region agent log
  try {
    fs.appendFileSync(
      DEBUG_LOG,
      `${JSON.stringify({ sessionId: "ec5947", timestamp: Date.now(), ...payload })}\n`,
    );
  } catch {
    // ignore logging failures
  }
  // #endregion
}

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
 * Proxies the PDF through Express so the browser never talks to Cloudinary
 * directly. Uses Cloudinary's Admin download API (api_key + signature) which
 * works even when anonymous PDF delivery is restricted (401 ACL failure).
 */
export const getDocumentFileController = async (req, res, next) => {
  const { documentId } = req.params;
  const userId = req.user?.id;

  try {
    console.log("STEP 1: Request received");
    console.log({ userId, documentId });

    // #region agent log
    agentDebugLog({
      hypothesisId: "route",
      location: "rag.controller.js:getDocumentFileController:step1",
      message: "Request received",
      data: { userId, documentId },
    });
    // #endregion

    console.log("STEP 2: Loading document from database");
    const document = await assertOwnedDocument(documentId, userId);

    console.log("STEP 2: Database document");
    console.log({
      document_id: document.document_id,
      title: document.title,
      byte_size: document.byte_size,
      status: document.status,
      storage_path: document.storage_path,
    });

    // #region agent log
    agentDebugLog({
      hypothesisId: "db",
      location: "rag.controller.js:getDocumentFileController:step2",
      message: "Document loaded",
      data: {
        documentId: document.document_id,
        hasStoragePath: Boolean(document.storage_path),
        storagePathIsHttps: document.storage_path?.startsWith("https://") ?? false,
        byteSize: document.byte_size,
      },
    });
    // #endregion

    if (!document.storage_path) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "No file URL found for this document.",
      });
    }

    console.log("STEP 3: storage_path");
    console.log(document.storage_path);

    console.log("STEP 4: Downloading PDF from Cloudinary (Admin API)");
    const { buffer: pdfBuffer, publicId, bytes } =
      await downloadCloudinaryRawPdf(document.storage_path);

    console.log("STEP 5: Cloudinary download success");
    console.log({
      publicId,
      bytes,
      pdfMagic: pdfBuffer.slice(0, 5).toString("ascii"),
    });

    // #region agent log
    agentDebugLog({
      hypothesisId: "cloudinary",
      location: "rag.controller.js:getDocumentFileController:step5",
      message: "Cloudinary download succeeded",
      data: {
        documentId,
        publicId,
        bytes,
        pdfMagic: pdfBuffer.slice(0, 5).toString("ascii"),
      },
    });
    // #endregion

    const filename = (document.title || "document.pdf")
      .replace(/[^\w\s.-]/g, "_")
      .replace(/\s+/g, "_");

    res.setHeader("Content-Type", document.mime_type || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("STEP ERROR: PDF proxy failed");
    console.error(error);
    console.error(error?.stack);

    // #region agent log
    agentDebugLog({
      hypothesisId: "cloudinary",
      location: "rag.controller.js:getDocumentFileController:error",
      message: "PDF proxy failed",
      data: {
        documentId,
        errorMessage: error?.message ?? String(error),
      },
    });
    // #endregion

    if (error?.statusCode === StatusCodes.NOT_FOUND) {
      return next(error);
    }

    return res.status(StatusCodes.BAD_GATEWAY).json({
      success: false,
      message: error?.message || "Failed to retrieve PDF from storage",
    });
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
