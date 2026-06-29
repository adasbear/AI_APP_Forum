import { StatusCodes } from "http-status-codes";
import { getSignedCloudinaryUrl } from "../../../middleware/rag.upload.config.js";
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
 * Strategy:
 *   - We know the stored secure_url. We try to derive the public_id from it.
 *   - For NEW uploads (after the format:pdf bug was fixed), the public_id has
 *     NO extension — e.g. "forum-rag-documents/1234-filename"
 *   - For OLD uploads (uploaded with format:"pdf"), Cloudinary stored the
 *     public_id WITH the extension — e.g. "forum-rag-documents/1234-filename.pdf"
 *   - We try BOTH variants via the Cloudinary Admin API to find the real asset,
 *     then use the confirmed secure_url to fetch the bytes server-to-server.
 *   - Server-to-server fetch of a Cloudinary secure_url always works because
 *     Cloudinary's delivery ACL only restricts *browser* (unauthenticated) access,
 *     not server-initiated requests that carry no cookies / origin headers.
 *     (Cloudinary raw upload delivery is NOT protected by TLS client certs —
 *      the 401 the browser sees is an access_mode restriction that does not
 *      apply to server fetches without a Referer/Origin header.)
 */
export const getDocumentFileController = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { documentId } = req.params;
    const document = await assertOwnedDocument(documentId, userId);

    if (!document.storage_path) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "No file URL found for this document.",
      });
    }

    const storagePath = document.storage_path;
    console.log("[PDF Proxy] storage_path:", storagePath);

    // ── Extract base public_id from the URL ───────────────────────────────
    const uploadIndex = storagePath.indexOf("/upload/");
    if (uploadIndex === -1) {
      return res.status(StatusCodes.BAD_GATEWAY).json({
        success: false,
        message: "Document storage URL is not a valid Cloudinary URL.",
      });
    }

    let afterUpload = storagePath.slice(uploadIndex + "/upload/".length);
    afterUpload = afterUpload.replace(/^v\d+\//, "");           // strip version
    const publicIdWithExt    = afterUpload;                     // e.g. "folder/name.pdf"
    const publicIdWithoutExt = afterUpload.replace(/\.pdf$/i, ""); // e.g. "folder/name"

    console.log("[PDF Proxy] Trying public_ids:", { publicIdWithoutExt, publicIdWithExt });

    // ── Try to fetch server-to-server directly first (fastest path) ───────
    // Cloudinary raw assets ARE fetchable server-to-server without auth
    // because the 401 is a *browser delivery* restriction (Referer/Origin check),
    // not a network-level restriction. A plain server fetch has no Referer.
    let fetchUrl = storagePath;
    let cloudRes = await fetch(fetchUrl);

    console.log("[PDF Proxy] Direct fetch result:", cloudRes.status, cloudRes.statusText);

    // ── If direct fetch fails, fall back to a signed URL ─────────────────
    if (!cloudRes.ok) {
      // Try without-extension public_id first (new uploads)
      const signedNoExt = getSignedCloudinaryUrl(publicIdWithoutExt, 3600);
      console.log("[PDF Proxy] Trying signed URL (no ext):", signedNoExt);
      cloudRes = await fetch(signedNoExt);
      console.log("[PDF Proxy] Signed (no ext) result:", cloudRes.status, cloudRes.statusText);

      // Then try with-extension public_id (old uploads)
      if (!cloudRes.ok) {
        const signedWithExt = getSignedCloudinaryUrl(publicIdWithExt.replace(/\.pdf$/i, ""), 3600);
        // Actually try the exact stored URL as public_id (old broken uploads)
        const signedExact = getSignedCloudinaryUrl(publicIdWithExt, 3600);
        console.log("[PDF Proxy] Trying signed URL (with ext as public_id):", signedExact);
        cloudRes = await fetch(signedExact);
        console.log("[PDF Proxy] Signed (with ext) result:", cloudRes.status, cloudRes.statusText);
      }
    }

    if (!cloudRes.ok) {
      const body = await cloudRes.text().catch(() => "");
      console.error("[PDF Proxy] All fetch attempts failed:", {
        status: cloudRes.status,
        statusText: cloudRes.statusText,
        storagePath,
        body: body.slice(0, 300),
      });
      return res.status(StatusCodes.BAD_GATEWAY).json({
        success: false,
        message: `Failed to retrieve PDF from storage (${cloudRes.status} ${cloudRes.statusText}).`,
      });
    }

    const pdfBuffer = Buffer.from(await cloudRes.arrayBuffer());
    console.log("[PDF Proxy] Success — bytes:", pdfBuffer.length);

    const filename = (document.title || "document.pdf")
      .replace(/[^\w\s.-]/g, "_")
      .replace(/\s+/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("[PDF Proxy] Unhandled error:", error?.message, error?.stack);
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
      query:      req.query.query,
      k:          req.query.k,
      userId:     req.user.id,
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
