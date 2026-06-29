import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEBUG_LOG = path.resolve(__dirname, "../../../debug-ec5947.log");

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

// ── Cloudinary configuration ──────────────────────────────────────────────────
function ensureCloudinaryConfigured() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

ensureCloudinaryConfigured();

// ── Memory storage — file arrives as req.file.buffer (no disk, no adapter) ───
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed"));
  }
  cb(null, true);
};

const maxSize = (process.env.RAG_MAX_UPLOAD_MB || 50) * 1024 * 1024;

export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSize },
});

export const createDocumentMulterErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

/**
 * Upload a Buffer to Cloudinary as a raw (non-image) resource.
 *
 * @param {Buffer}  buffer       - Raw PDF bytes
 * @param {string}  originalName - Original filename (used for public_id)
 * @returns {Promise<string>}    - Cloudinary secure_url
 */
export function uploadBufferToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    ensureCloudinaryConfigured();

    const nameWithoutExt = originalName.replace(/\.pdf$/i, "");
    const publicId = `forum-rag-documents/${Date.now()}-${nameWithoutExt}`;

    // #region agent log
    agentDebugLog({
      hypothesisId: "B",
      location: "rag.upload.config.js:uploadBufferToCloudinary:entry",
      message: "Cloudinary upload starting",
      data: {
        bufferLength: buffer?.length ?? null,
        isBuffer: Buffer.isBuffer(buffer),
        byteOffset: buffer?.byteOffset ?? null,
        byteLength: buffer?.byteLength ?? null,
        pdfMagic: buffer?.slice?.(0, 5)?.toString?.("ascii") ?? null,
        originalName,
        publicId,
        cloudConfigured: Boolean(
          process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET,
        ),
      },
    });
    // #endregion

    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "raw", public_id: publicId },
      (error, result) => {
        // #region agent log
        agentDebugLog({
          hypothesisId: error ? "A,C,D,E" : "A,C",
          location: "rag.upload.config.js:uploadBufferToCloudinary:callback",
          message: error ? "Cloudinary upload failed" : "Cloudinary upload succeeded",
          data: {
            errorMessage: error?.message ?? null,
            errorHttpCode: error?.http_code ?? null,
            secureUrl: result?.secure_url ?? null,
            bytesWritten: buffer?.length ?? null,
            uploadStreamWritableEnded: uploadStream?.writableEnded ?? null,
          },
        });
        // #endregion
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );

    // Write directly to Cloudinary's upload stream (avoids PassThrough pipe races).
    uploadStream.end(buffer);
  });
}

// Exported so rag.service.js can call cloudinary.uploader.destroy for deletions
export { cloudinary };
