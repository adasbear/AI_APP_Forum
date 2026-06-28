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
import { cloudinary } from "../../../middleware/rag.upload.config.js";

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
 */
export async function createDocumentFromUploadService({ file, userId }) {
  validateUploadedDocument(file);

  if (!userId) {
    throw new Error("userId is required");
  }

  // multer-storage-cloudinary puts the Cloudinary secure URL on file.path
  const cloudinaryUrl = file.path;
  if (!cloudinaryUrl) {
    throw new Error("Cloudinary URL is missing from uploaded file");
  }

  let documentId = null;

  try {
    const insertDocumentSql = `
      INSERT INTO documents
      (
        user_id,
        title,
        mime_type,
        storage_path,
        byte_size,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const documentResult = await safeExecute(insertDocumentSql, [
      userId,
      file.originalname,
      file.mimetype,
      cloudinaryUrl,         // full Cloudinary HTTPS URL
      file.size,
      "processing",
    ]);

    documentId = documentResult.insertId;

    // Fetch the PDF from Cloudinary into a buffer for parsing
    console.log("Fetching PDF from Cloudinary:", cloudinaryUrl);
    const fetchResponse = await fetch(cloudinaryUrl);
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch PDF from Cloudinary: ${fetchResponse.statusText}`);
    }
    const arrayBuffer = await fetchResponse.arrayBuffer();
    let buffer = new Uint8Array(arrayBuffer);

    console.log("Processing PDF:", {
      originalName: file.originalname,
      size: file.size,
      bufferLength: buffer.length,
    });

    // Extract text with pdf-parse
    const parser = new PDFParse(buffer);
    const result = await parser.getText();

    const extractedText = result.text?.trim();

    console.log("PDF text extracted:", {
      textLength: extractedText?.length || 0,
      firstChars: extractedText?.substring(0, 100),
    });

    if (!extractedText) {
      throw new Error("No text could be extracted from PDF");
    }

    const chunks = chunkText(extractedText, 1000, 150);

    console.log("Text chunked:", {
      totalChunks: chunks.length,
      firstChunkLength: chunks[0]?.length,
    });

    if (!chunks?.length) {
      throw new Error("Chunking failed: no text chunks created");
    }

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];

      console.log(`Processing chunk ${index + 1}/${chunks.length}`);

      const embeddingResult = await generateQuestionEmbedding(chunk);

      if (!embeddingResult?.embedding) {
        throw new Error("Embedding generation failed");
      }

      const chunkResult = await safeExecute(
        `
        INSERT INTO document_chunks
        (
          document_id,
          chunk_index,
          content
        )
        VALUES (?, ?, ?)
        `,
        [documentId, index, chunk],
      );

      const chunkId = chunkResult.insertId;

      await safeExecute(
        `
        INSERT INTO document_chunk_vectors
        (
          chunk_id,
          source_text,
          embedding,
          status
        )
        VALUES (?, ?, ?, ?)
        `,
        [chunkId, chunk, JSON.stringify(embeddingResult.embedding), "ready"],
      );
    }

    console.log("All chunks processed successfully");

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