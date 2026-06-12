import { GoogleGenAI } from "@google/genai";
import { safeExecute } from "../../../../db/config.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Generate a normalized embedding for the provided question text using the Gemini API
 * and return the embedding values as an array of numbers.
 *
 * @param {string} text - The text to embed.
 * @param {object} options - Additional options for embedding generation
 * @param {string} [options.taskType] - Optional task type to influence embedding generation (e.g., "question", "answer")
 * @return {Promise<number[]>} - The generated embedding values as an array of numbers
 */
export const generateQuestionEmbedding = async (text, options = {}) => {
  try {
    const response = await ai.models.embedContent({
      model: GEMINI_EMBEDDING_MODEL,
      contents: [text],
      ...options,
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Embedding response did not contain values");
    }

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate question embedding");
  }
};

/**
 * Normalize the question title by converting to lowercase, applying unicode NFKC normalization,
 * and collapsing multiple whitespace characters into single spaces.
 * This ensures consistent text formatting for downstream tasks such as duplicate detection and vector generation.
 *
 * @param {string} text - The question title to normalize
 * @return {string} - The normalized question title
 */
export const normalizationQuestionText = (text) => {
  return `${text || ""}`
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @return {number} - Cosine similarity score between -1 and 1
 * @throws {Error} - If vectors are of different lengths or if norm is zero
 */
export const calculatecosineSimilarity = (vecA, vecB) => {
  // Validate vectors have same length
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must be of the same length");
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (normA === 0 || normB === 0) {
    throw new Error("Vector norm cannot be zero");
  }

  return dotProduct / (normA * normB);
};

/**
 * Store a question vector embedding in the database
 * @param {number} questionId - The question ID
 * @param {string} sourceText - The source text that was embedded
 * @param {number[]} embedding - The embedding vector
 * @param {string} status - The status of the embedding (e.g., 'ready', 'failed')
 * @return {Promise<void>}
 */
export const storeQuestionVector = async (
  questionId,
  sourceText,
  embedding,
  status = "ready",
) => {
  const insertVectorSql =
    "INSERT INTO question_vectors (question_id, source_text, embedding, status) VALUES (?, ?, ?, ?)";
  await safeExecute(insertVectorSql, [
    questionId,
    sourceText,
    JSON.stringify(embedding),
    status,
  ]);
};

/**
 * Get vector configuration for this instance
 * @return {object} - Configuration object with API key and model information
 */
export const getVectorConfig = () => {
  return {
    apiKey: GEMINI_API_KEY ? "configured" : "missing",
    embeddingModel: GEMINI_EMBEDDING_MODEL,
  };
};

/**
 * Find similar questions by question ID using vector embeddings
 * @param {number} questionId - The question ID to find similarities for
 * @param {number} limit - Maximum number of similar questions to return
 * @return {Promise<array>} - Array of similar questions
 */
export const findSimilarQuestionsByQuestionId = async (
  questionId,
  limit = 5,
) => {
  const sql = `
    SELECT 
      q.question_id,
      q.question_hash,
      q.title,
      qv.embedding
    FROM questions q
    JOIN question_vectors qv ON q.question_id = qv.question_id
    WHERE q.question_id != ?
    LIMIT ?
  `;

  const rows = await safeExecute(sql, [questionId, limit]);
  return rows;
};

/**
 * Find similar questions by text using vector embeddings
 * @param {string} text - The text to find similar questions for
 * @param {number} limit - Maximum number of similar questions to return
 * @return {Promise<array>} - Array of similar questions
 */
export const findSimilarQuestionsByText = async (text, limit = 5) => {
  try {
    const embedding = await generateQuestionEmbedding(text);

    const sql = `
      SELECT 
        q.question_id,
        q.question_hash,
        q.title,
        qv.embedding
      FROM questions q
      JOIN question_vectors qv ON q.question_id = qv.question_id
      LIMIT ?
    `;

    const rows = await safeExecute(sql, [limit]);

    // Calculate cosine similarity for each result and sort
    const resultsWithSimilarity = rows
      .map((row) => {
        try {
          const rowEmbedding = JSON.parse(row.embedding);
          const similarity = calculatecosineSimilarity(embedding, rowEmbedding);
          return { ...row, similarity };
        } catch (e) {
          return { ...row, similarity: 0 };
        }
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return resultsWithSimilarity;
  } catch (error) {
    console.error("Error finding similar questions:", error);
    throw error;
  }
};
