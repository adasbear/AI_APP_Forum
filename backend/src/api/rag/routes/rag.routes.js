import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { uploadDocument } from "../../../middleware/rag.upload.config.js";
import {
  listDocumentsController,
  getDocumentMetaController,
  getDocumentFileController,
  createDocumentController,
  queryDocumentController,
  searchInDocumentController,
  deleteDocumentController,
} from "../controller/rag.controller.js";
import {
  documentIdParamValidation,
  queryDocumentValidation,
} from "../validations/rag.validation.js";

const router = express.Router();

/**
 * GET /api/rag/documents
 */
router.get(
  "/",
  authenticateUser,
  listDocumentsController,
);

/**
 * POST /api/rag/documents
 */
router.post(
  "/",
  authenticateUser,
  uploadDocument.single("file"),
  createDocumentController,
);

/**
 * GET /api/rag/documents/:documentId
 */
router.get(
  "/:documentId",
  authenticateUser,
  documentIdParamValidation,
  getDocumentMetaController,
);

/**
 * GET /api/rag/documents/:documentId/file
 */
router.get(
  "/:documentId/file",
  authenticateUser,
  documentIdParamValidation,
  getDocumentFileController,
);

/**
 * POST /api/rag/documents/:documentId/query
 */
router.post(
  "/:documentId/query",
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController,
);

/**
 * GET /api/rag/documents/:documentId/search
 */
router.get(
  "/:documentId/search",
  authenticateUser,
  documentIdParamValidation,
  searchInDocumentController,
);

/**
 * DELETE /api/rag/documents/:documentId
 */
router.delete(
  "/:documentId",
  authenticateUser,
  documentIdParamValidation,
  deleteDocumentController,
);

export default router;