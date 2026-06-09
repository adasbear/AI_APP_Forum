import { GoogleGenAI } from "@google/genai";
// import { serviceUnavailableError } from "../../../utils/errors/index.js";
import { safeExecute } from "../../../../db/config.js";
// import { normalizeWhitespace } from "../../../utils/stringUtils.js";

const GEMINI_API_MODEL = process.env.GEMINI_API_MODEL || "gemini-embedding-001";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const RECOMMENDED_THRESHOLD = Number(process.env.RECOMMENDED_THRESHOLD) || 0.75;
const RECOMMENDED_K = Number(process.env.RECOMMENDED_K) || 5;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const ai = new GoogleGenAI({ GEMINI_API_KEY });

function normalizeWhitespace(text) {
  return text.trim().replace(/\s+/g, " ");
}

export function normalizeQuestionText({ title }) {
  return normalizeWhitespace(`${title || ""}`.normalize("NFKC").toLowerCase());
}

export async function generateQuestionEmbedding(sourceText, options = {}) {
  const { taskType = "RETRIEVAL_DOCUMENT", questionId = null } = options;

  try {
    const response = await ai.models.embedContent({
      model: GEMINI_API_MODEL,
      contents: sourceText,
      config: {
        taskType: taskType,
        outputDimensionality: 768,
      },
    });

    const embeddingLength = response.embeddings[0].values.length;
    console.log(`Length of embedding: ${embeddingLength}`);

    const values = response.embeddings[0].values;

    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("Gemini embedding response does not contain values");
    }
    return {
      embedding: values,
    };
  } catch (error) {
    console.error("Error generating embedding:", error);
    console.error("==========================================");
    throw error;
  }
}

function validateEmbedding(embedding) {
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding must be an array");
  }
  if (embedding.length === 0) {
    throw new Error("Embedding array cannot be empty");
  }
  if (!embedding.every((v) => typeof v === "number" && !isNaN(v))) {
    throw new Error("Embedding must contain only valid numbers");
  }
}

export async function storeQuestionVector({
  questionId,
  sourceText,
  embedding = [],
  status = "ready",
}) {
  if (status === "failed" || embedding.length === 0) {
    const sql = `insert into question_vectors (question_id, source_text, embedding, status) values (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE source_text = VALUES(source_text), embedding = VALUES(embedding), status = VALUES(status),
      updated_at = CURRENT_TIMESTAMP()`;
    await safeExecute(sql, [
      questionId,
      sourceText,
      JSON.stringify(embedding),
      "failed",
    ]);
    return;
  }

  validateEmbedding(embedding);
  const embeddingJson = JSON.stringify(embedding);

  const sql = `insert into question_vectors (question_id, source_text, embedding, status) values (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE source_text = VALUES(source_text), embedding = VALUES(embedding), status = VALUES(status),
    updated_at = CURRENT_TIMESTAMP()`;

  try {
    await safeExecute(sql, [questionId, sourceText, embeddingJson, status]);
  } catch (error) {
    console.error(`===MY SQL INSERT/UPDATE ERROR===`);
    console.error(`Operation: storeQuestionVector`);
    console.error(`Question ID: ${questionId}`);
    console.error(`Embedding Length: ${embedding.length}`);
    console.error(`Status: ${status}`);
    console.error("==========================================");
    throw error;
  }
}
