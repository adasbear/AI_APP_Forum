import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

import { safeExecute } from "../../../../db/config.js";

import {
  ServiceUnavailableError,
  NotFoundError,
} from "../../../utils/errors/index.js";

import { embedQuery } from "../../../utils/gemini.js";
import { cosineSimilarity } from "../../../utils/math.js";

import {
  findSimilarQuestionsByQuestionId,
  findSimilarQuestionsByText,
  generateQuestionEmbedding,
  getVectorConfig,
  normalizationQuestionText,
  storeQuestionVector,
} from "./vector.service.js";

const RECOMMEND_THRESHOLD = 0.75;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Generate embedding using Gemini API
 */
const generateEmbedding = async (text) => {
  try {
    const response = await ai.models.embedContent({
      model: GEMINI_EMBEDDING_MODEL,
      contents: [text],
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Embedding response did not contain values");
    }

    return embedding;
  } catch (error) {
    throw new ServiceUnavailableError(
      "Failed to generate question embedding"
    );
  }
};

/**
 * Create question with vector embedding
 */
export const createQuestionWithVectorService = async ({
  userId,
  title,
  content,
}) => {
  if (!userId) {
    throw new Error("Authenticated user is required to create a question");
  }

  const questionHash = crypto.randomBytes(8).toString("hex");

  const insertQuestionSql = `
    INSERT INTO questions 
    (question_hash, user_id, title, content)
    VALUES (?, ?, ?, ?)
  `;

  const result = await safeExecute(insertQuestionSql, [
    questionHash,
    userId,
    title,
    content,
  ]);

  const questionId = result.insertId;

  let embeddingValues = [];
  let status = "ready";

  try {
    embeddingValues = await generateEmbedding(title);
  } catch (error) {
    status = "failed";
  }

  const insertVectorSql = `
    INSERT INTO question_vectors
    (question_id, source_text, embedding, status)
    VALUES (?, ?, ?, ?)
  `;

  await safeExecute(insertVectorSql, [
    questionId,
    title,
    JSON.stringify(embeddingValues),
    status,
  ]);

  return {
    id: questionId,
    questionHash,
    title,
    content,
    userId,
  };
};

/**
 * Get all questions
 */
export const getQuestionsService = async ({
  search,
  mine,
  userId,
}) => {
  let baseSql = `
    SELECT 
      q.question_id AS id,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      q.created_at AS createdAt,
      q.updated_at AS updatedAt,
      u.user_id AS authorId,
      u.first_name AS firstName,
      u.last_name AS lastName,
      COUNT(DISTINCT a.answer_id) AS answerCount
    FROM questions q
    JOIN users u ON q.user_id = u.user_id
    LEFT JOIN answers a ON q.question_id = a.question_id
  `;

  const whereConditions = [];
  const params = [];

  if (search) {
    whereConditions.push("(q.title LIKE ? OR q.content LIKE ?)");
    const searchTerm = `%${search}%`;

    params.push(searchTerm, searchTerm);
  }

  if (mine) {
    whereConditions.push("q.user_id = ?");
    params.push(userId);
  }

  if (whereConditions.length > 0) {
    baseSql += ` WHERE ${whereConditions.join(" AND ")}`;
  }

  baseSql += `
    GROUP BY 
      q.question_id,
      q.question_hash,
      q.title,
      q.content,
      q.created_at,
      q.updated_at,
      u.user_id,
      u.first_name,
      u.last_name
    ORDER BY q.created_at DESC
    LIMIT 100
  `;

  const rows = await safeExecute(baseSql, params);

  const data = rows.map((row) => ({
    id: row.id,
    questionHash: row.questionHash,
    title: row.title,
    content: row.content,
    answerCount: row.answerCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.authorId,
      firstName: row.firstName,
      lastName: row.lastName,
    },
  }));

  return {
    success: true,
    message: "Questions fetched successfully.",
    data,
    meta: {
      limit: 100,
      total: data.length,
      sortBy: "newest",
      sortOrder: "desc",
    },
  };
};

/**
 * Get single question with answers
 */
export const getSingleQuestionService = async ({
  questionHash,
}) => {
  const questionSql = `
    SELECT 
      q.question_id AS id,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      q.created_at AS createdAt,
      q.updated_at AS updatedAt,
      u.user_id AS authorId,
      u.first_name AS firstName,
      u.last_name AS lastName
    FROM questions q
    JOIN users u ON q.user_id = u.user_id
    WHERE q.question_hash = ?
  `;

  const questions = await safeExecute(questionSql, [questionHash]);

  if (questions.length === 0) {
    throw new NotFoundError("Question not found");
  }

  const question = questions[0];

  const answersSql = `
    SELECT 
      a.answer_id AS id,
      a.content,
      a.created_at AS createdAt,
      a.updated_at AS updatedAt,
      u.user_id AS authorId,
      u.first_name AS firstName,
      u.last_name AS lastName
    FROM answers a
    JOIN users u ON a.user_id = u.user_id
    WHERE a.question_id = ?
    ORDER BY a.created_at ASC
  `;

  const answerRows = await safeExecute(answersSql, [question.id]);

  const answers = answerRows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.authorId,
      firstName: row.firstName,
      lastName: row.lastName,
    },
  }));

  return {
    success: true,
    message: "Question fetched successfully",
    question: {
      id: question.id,
      questionHash: question.questionHash,
      title: question.title,
      content: question.content,
      answerCount: answers.length,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      author: {
        id: question.authorId,
        firstName: question.firstName,
        lastName: question.lastName,
      },
    },
    answers,
    answersMeta: {
      limit: 100,
      total: answers.length,
    },
  };
};

/**
 * Semantic search questions
 */
export const searchQuestionsSemanticService = async (
  query,
  k = 5,
  threshold = RECOMMEND_THRESHOLD
) => {
  const queryEmbedding = await embedQuery(query);

  const vectorsSql = `
    SELECT question_id, embedding
    FROM question_vectors
    WHERE status = 'ready'
  `;

  const vectors = await safeExecute(vectorsSql, []);

  if (vectors.length === 0) {
    return [];
  }

  const scoredVectors = vectors.map((row) => {
    const embedding =
      typeof row.embedding === "string"
        ? JSON.parse(row.embedding)
        : row.embedding;

    const score = cosineSimilarity(queryEmbedding, embedding);

    return {
      question_id: row.question_id,
      score,
    };
  });

  const filtered = scoredVectors
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  if (filtered.length === 0) {
    return [];
  }

  const questionIds = filtered.map((item) => item.question_id);

  const placeholders = questionIds.map(() => "?").join(",");

  const detailsSql = `
    SELECT 
      q.question_id AS id,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      q.created_at AS createdAt,
      q.updated_at AS updatedAt,
      u.user_id,
      u.first_name AS firstName,
      u.last_name AS lastName,
      (
        SELECT COUNT(*)
        FROM answers a
        WHERE a.question_id = q.question_id
      ) AS answerCount
    FROM questions q
    JOIN users u ON q.user_id = u.user_id
    WHERE q.question_id IN (${placeholders})
  `;

  const questionDetails = await safeExecute(
    detailsSql,
    questionIds
  );

  return filtered
    .map((scoredItem) => {
      const detail = questionDetails.find(
        (q) => q.id === scoredItem.question_id
      );

      if (!detail) {
        return null;
      }

      return {
        id: detail.id,
        questionHash: detail.questionHash,
        title: detail.title,
        content: detail.content,
        answerCount: detail.answerCount,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        author: {
          id: detail.user_id,
          firstName: detail.firstName,
          lastName: detail.lastName,
        },
        score: scoredItem.score,
      };
    })
    .filter(Boolean);
};

/**
 * Get similar questions
 */
export const getSimilarQuestionsService = async (
  questionHash,
  k = 5,
  threshold = RECOMMEND_THRESHOLD
) => {
  const sourceSql = `
    SELECT 
      v.question_id,
      v.embedding
    FROM question_vectors v
    JOIN questions q
      ON v.question_id = q.question_id
    WHERE q.question_hash = ?
      AND v.status = 'ready'
  `;

  const sourceResult = await safeExecute(sourceSql, [
    questionHash,
  ]);

  if (sourceResult.length === 0) {
    throw new NotFoundError(
      "Source question vector not found or not ready"
    );
  }

  const sourceRow = sourceResult[0];

  const sourceEmbedding =
    typeof sourceRow.embedding === "string"
      ? JSON.parse(sourceRow.embedding)
      : sourceRow.embedding;

  const sourceQuestionId = sourceRow.question_id;

  const vectorsSql = `
    SELECT question_id, embedding
    FROM question_vectors
    WHERE status = 'ready'
      AND question_id != ?
  `;

  const vectors = await safeExecute(vectorsSql, [
    sourceQuestionId,
  ]);

  if (vectors.length === 0) {
    return [];
  }

  const scoredVectors = vectors.map((row) => {
    const embedding =
      typeof row.embedding === "string"
        ? JSON.parse(row.embedding)
        : row.embedding;

    const score = cosineSimilarity(sourceEmbedding, embedding);

    return {
      question_id: row.question_id,
      score,
    };
  });

  const filtered = scoredVectors
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  if (filtered.length === 0) {
    return [];
  }

  const questionIds = filtered.map((item) => item.question_id);

  const placeholders = questionIds.map(() => "?").join(",");

  const detailsSql = `
    SELECT 
      q.question_id AS id,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      q.created_at AS createdAt,
      q.updated_at AS updatedAt,
      u.user_id,
      u.first_name AS firstName,
      u.last_name AS lastName,
      (
        SELECT COUNT(*)
        FROM answers a
        WHERE a.question_id = q.question_id
      ) AS answerCount
    FROM questions q
    JOIN users u ON q.user_id = u.user_id
    WHERE q.question_id IN (${placeholders})
  `;

  const questionDetails = await safeExecute(
    detailsSql,
    questionIds
  );

  return filtered
    .map((scoredItem) => {
      const detail = questionDetails.find(
        (q) => q.id === scoredItem.question_id
      );

      if (!detail) {
        return null;
      }

      return {
        id: detail.id,
        questionHash: detail.questionHash,
        title: detail.title,
        content: detail.content,
        answerCount: detail.answerCount,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        author: {
          id: detail.user_id,
          firstName: detail.firstName,
          lastName: detail.lastName,
        },
        score: scoredItem.score,
      };
    })
    .filter(Boolean);
};