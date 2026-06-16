import express from "express";

const router = express.Router();


import { authenticateUser } from "../../../middleware/authentication.js";
import { getDocumentMetaController, queryDocumentController } from "../controller/rag.controller.js";
import { documentIdParamValidation, queryDocumentValidation } from "../validations/rag.validation.js";
import { createDocumentController } from "../controller/rag.controller.js";
import { uploadDocument } from "../../../middleware/rag.upload.config.js";
import { authenticateUser } from "../../../middleware/authentication.js";
import { searchInDocumentController } from "../controller/rag.controller.js";

const router = express.Router();

router.get(
  "/documents/:documentId",
  authenticateUser,
  documentIdParamValidation,
  getDocumentMetaController
);

router.post(
  "/documents",
  authenticateUser,
  uploadDocument.single("file"),
  createDocumentController,
);

router.post(
  "/documents/:documentId/query",
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController,
  );

router.get(
  "/documents/:documentId/search",
  authenticateUser,
  searchInDocumentController,
);

export default router;
