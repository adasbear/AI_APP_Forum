import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

import { safeExecute } from "../../../../db/config.js";
import { chunkText } from "../../../utils/chunking.js";
import { validateUploadedDocument } from "../validations/rag.validation.js";
import { generateQuestionEmbedding } from "../../questions/service/vector.service.js";
import {
  NotFoundError,
  ForbiddenError,
  ServiceUnavailableError,
} from "../../../utils/errors/index.js";
import { embedQuery, getGeminiClient } from "../../../utils/gemini.js";
import { cosineSimilarity } from "../../../utils/math.js";
import { cloudinary, uploadBufferToCloudinary } from "../../../middleware/rag.upload.config.js";

const K_CHUNKS = 5;

/**
 * List all documents owned by the authenticated user.
 */
export const listDocumentsForUserService = async (userId) => {
  const sql = `
    SELECT 
      document_id,
      title,
      mime_type,
      byte_size,
      status,
      error_message,
      storage_path,
      created_at,
      updated_at
    FROM documents
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  const rows = await safeExecute(sql, [userId]);

  return rows.map((row) => ({
    document_id: row.document_id,
    title: row.title,
    mime_type: row.mime_type,
    byte_size: row.byte_size,
    status: row.status,
    error_message: row.error_message,
    storage_path: row.storage_path,   // Cloudinary URL — used directly by the frontend
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
};

/**
 * Get document metadata by ID, ensuring it belongs to the authenticated user.
 */
export const getDocumentMetaService = async (documentId, userId) => {
  const sql = `
    SELECT
      document_id,
      title,
      mime_type,
      byte_size,
      status,
      error_message,
      created_at,
      updated_at,
      user_id,
      storage_path
    FROM documents
    WHERE document_id = ? AND user_id = ?
  `;

  const rows = await safeExecute(sql, [documentId, userId]);

  if (rows.length === 0) {
    throw new NotFoundError("Document not found or you do not have access");
  }

  const row = rows[0];

  return {
    document_id: row.document_id,
    title: row.title,
    mime_type: row.mime_type,
    byte_size: row.byte_size,
    status: row.status,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: row.user_id,
    storage_path: row.storage_path,
  };
};

/**
 * Convenience method: alias for getDocumentMetaService, often used
 * prior to operating on the file to ensure ownership.
 */
export const assertOwnedDocument = async (documentId, userId) => {
  return await getDocumentMetaService(documentId, userId);
};

/**
 * Delete Document Service
 */
export const deleteDocumentService = async (documentId, userId) => {
  // Ownership check via existing service — throws NotFoundError or ForbiddenError
  const document = await getDocumentMetaService(documentId, userId);

  // Delete from Cloudinary if a storage_path (URL) is present.
  // Cloudinary raw public_id is derived from the URL path between /upload/ and the extension.
  if (document.storage_path) {
    try {
      // storage_path is now the full Cloudinary URL, e.g.
      // https://res.cloudinary.com/dhat3cisg/raw/upload/v123/forum-rag-documents/1234-filename.pdf
      // We need to extract the public_id: "forum-rag-documents/1234-filename"
      const url = document.storage_path;
      const uploadIndex = url.indexOf("/upload/");
      if (uploadIndex !== -1) {
        // Everything after /upload/v<version>/ and before the last extension
        let afterUpload = url.slice(uploadIndex + "/upload/".length);
        // Strip version segment (v followed by digits)
        afterUpload = afterUpload.replace(/^v\d+\//, "");
        // Strip file extension
        const publicId = afterUpload.replace(/\.[^/.]+$/, "");
        await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      }
    } catch (err) {
      // Log but don't block deletion — DB record should still be removed
      console.warn("Cloudinary delete failed:", err.message);
    }
  }

  // Delete document record (CASCADE removes chunks + vectors automatically)
  await safeExecute(
    `DELETE FROM documents WHERE document_id = ?`,
    [documentId],
  );

  return { id: documentId };
};

/**
 * Upload & Process Document
 *
 * Flow:
 *   1. multer memoryStorage puts raw bytes in file.buffer — no disk, no adapter corruption
 *   2. Upload the untouched buffer to Cloudinary before parsing (pdf-parse detaches ArrayBuffer)
 *   3. Parse the PDF from the in-memory buffer for text extraction
 *   4. Store the Cloudinary URL in DB as storage_path
 */
export async function createDocumentFromUploadService({ file, userId }) {
  validateUploadedDocument(file);

  if (!userId) throw new Error("userId is required");

  // multer memoryStorage puts raw file bytes here
  const rawBuffer = file.buffer;
  if (!rawBuffer || rawBuffer.length === 0) {
    throw new Error("File buffer is empty — upload may have failed");
  }

  let documentId = null;

  try {
    // ── 1. Upload raw buffer to Cloudinary BEFORE parsing ───────────────────
    // pdf-parse v2 transfers the TypedArray's underlying ArrayBuffer to a
    // worker thread, which detaches it on the main thread. Uploading after
    // parse sends an empty payload to Cloudinary ("Empty file" 400).
    console.log("Uploading PDF buffer to Cloudinary...");
    // #region agent log
    fetch('http://127.0.0.1:7698/ingest/2f83031b-9ba6-42c9-b192-60411a447540',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ec5947'},body:JSON.stringify({sessionId:'ec5947',runId:'pre-fix',hypothesisId:'F',location:'rag.service.js:beforeUpload',message:'Buffer state before Cloudinary upload',data:{bufferLength:rawBuffer.length,pdfMagic:rawBuffer.slice(0,5).toString('ascii'),arrayBufferDetached:rawBuffer.buffer?.detached ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const cloudinaryUrl = await uploadBufferToCloudinary(
      Buffer.from(rawBuffer),
      file.originalname,
    );
    console.log("Cloudinary URL:", cloudinaryUrl);

    // ── 2. Parse PDF from in-memory buffer (may detach underlying ArrayBuffer) ──
    console.log("Processing PDF:", {
      originalName: file.originalname,
      size: file.size,
      bufferLength: rawBuffer.length,
    });

    // pdf-parse v2 expects Uint8Array
    const uint8 = new Uint8Array(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.byteLength);
    const parser = new PDFParse(uint8);
    const result = await parser.getText();
    const extractedText = result.text?.trim();

    console.log("PDF text extracted:", {
      textLength: extractedText?.length || 0,
      firstChars: extractedText?.substring(0, 100),
    });

    if (!extractedText) throw new Error("No text could be extracted from PDF");

    // #region agent log
    fetch('http://127.0.0.1:7698/ingest/2f83031b-9ba6-42c9-b192-60411a447540',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ec5947'},body:JSON.stringify({sessionId:'ec5947',runId:'pre-fix',hypothesisId:'F',location:'rag.service.js:afterParse',message:'Buffer state after PDF parse',data:{bufferLength:rawBuffer.length,arrayBufferDetached:rawBuffer.buffer?.detached ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // ── 3. Insert DB record now that we have the real storage_path ─────────
    const documentResult = await safeExecute(
      `INSERT INTO documents (user_id, title, mime_type, storage_path, byte_size, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, file.originalname, file.mimetype, cloudinaryUrl, file.size, "processing"],
    );
    documentId = documentResult.insertId;

    // ── 4. Chunk + embed ───────────────────────────────────────────────────
    const chunks = chunkText(extractedText, 1000, 150);

    console.log("Text chunked:", {
      totalChunks: chunks.length,
      firstChunkLength: chunks[0]?.length,
    });

    if (!chunks?.length) throw new Error("Chunking failed: no text chunks created");

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      console.log(`Processing chunk ${index + 1}/${chunks.length}`);

      const embeddingResult = await generateQuestionEmbedding(chunk);
      if (!embeddingResult?.embedding) throw new Error("Embedding generation failed");

      const chunkResult = await safeExecute(
        `INSERT INTO document_chunks (document_id, chunk_index, content) VALUES (?, ?, ?)`,
        [documentId, index, chunk],
      );
      const chunkId = chunkResult.insertId;

      await safeExecute(
        `INSERT INTO document_chunk_vectors (chunk_id, source_text, embedding, status)
         VALUES (?, ?, ?, ?)`,
        [chunkId, chunk, JSON.stringify(embeddingResult.embedding), "ready"],
      );
    }

    console.log("All chunks processed successfully");

    // ── 5. Mark ready ──────────────────────────────────────────────────────
    await safeExecute(
      `UPDATE documents SET status = 'ready' WHERE document_id = ?`,
      [documentId],
    );

    const documents = await safeExecute(
      `SELECT * FROM documents WHERE document_id = ?`,
      [documentId],
    );
    return documents[0];

  } catch (error) {
    if (documentId) {
      await safeExecute(
        `UPDATE documents SET status = 'failed', error_message = ? WHERE document_id = ?`,
        [error.message, documentId],
      );
    }
    throw error;
  }
}

/**
 * Search Chunks Only
 */
export async function searchInDocumentService({
  documentId,
  query,
  k = 5,
  userId,
}) {
  const doc = await getDocumentMetaService(documentId, userId);

  if (doc.status !== "ready") {
    throw new Error("Document is not ready for search");
  }

  const queryEmbedding = await generateQuestionEmbedding(query, {
    taskType: "RETRIEVAL_QUERY",
  });

  const queryVector = queryEmbedding.embedding;

  const chunks = await safeExecute(
    `
    SELECT
      c.chunk_id,
      c.chunk_index,
      c.content,
      v.embedding
    FROM document_chunks c
    JOIN document_chunk_vectors v
      ON c.chunk_id = v.chunk_id
    WHERE c.document_id = ?
    `,
    [documentId],
  );

  const results = chunks
    .map((c) => {
      try {
        const vector =
          typeof c.embedding === "string"
            ? JSON.parse(c.embedding)
            : c.embedding;

        if (!Array.isArray(vector)) {
          return null;
        }

        return {
          chunkId: c.chunk_id,
          chunkIndex: c.chunk_index,
          score: cosineSimilarity(queryVector, vector),
          excerpt: c.content,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const ranked = results
    .filter((r) => r.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return {
    query,
    results: ranked,
  };
}

/**
 * Generate Answer From Retrieved Chunks
 */
const answerFromRagChunksService = async (query, contextText) => {
  try {
    const ai = getGeminiClient();

    const prompt = `
You are a helpful AI assistant.

You must answer the user's question ONLY using the provided document context.

If the answer cannot be found in the context, say:
"I cannot answer this based on the provided document."

Context:
${contextText}

Question:
${query}

Answer:
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch {
    throw new ServiceUnavailableError("Failed to generate answer from AI");
  }
};

/**
 * Full RAG Query Service
 */
export const queryDocumentService = async (documentId, userId, query) => {
  await getDocumentMetaService(documentId, userId);

  const queryEmbedding = await embedQuery(query);

  const chunkRows = await safeExecute(
    `
    SELECT
      c.chunk_id,
      c.chunk_index,
      c.content,
      v.embedding
    FROM document_chunks c
    JOIN document_chunk_vectors v
      ON c.chunk_id = v.chunk_id
    WHERE c.document_id = ?
      AND v.status = 'ready'
    `,
    [documentId],
  );

  if (chunkRows.length === 0) {
    return {
      answer: "No processed text chunks found for this document.",
      citations: [],
      chunksUsed: [],
    };
  }

  const scoredChunks = chunkRows.map((row) => {
    const embedding =
      typeof row.embedding === "string"
        ? JSON.parse(row.embedding)
        : row.embedding;

    return {
      ...row,
      score: cosineSimilarity(queryEmbedding, embedding),
    };
  });

  const topChunks = scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, K_CHUNKS);

  const contextText = topChunks
    .map((chunk) => `[Chunk ${chunk.chunk_index}]\n${chunk.content}`)
    .join("\n\n");

  const answer = await answerFromRagChunksService(query, contextText);

  return {
    answer,
    citations: topChunks.map((chunk, index) => ({
      ref: index + 1,
      chunkIndex: chunk.chunk_index,
    })),
    chunksUsed: topChunks.map((chunk) => chunk.chunk_index),
  };
};