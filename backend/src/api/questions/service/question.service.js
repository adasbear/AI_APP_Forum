import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { safeExecute } from "../../../../db/config.js";
import {
  ServiceUnavailableError,
  NotFoundError,
} from "../../../utils/errors/index.js";

import {
  findSimilarQuestionsByQuestionId,
  findSimilarQuestionsByText,
  generateQuestionEmbedding,
  getVectorConfig,
  normalizationQuestionText,
  storeQuestionVector,
} from "./vector.service.js";


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
    throw new ServiceUnavailableError("Failed to generate question embedding");
  }
};

export const createQuestionWithVectorService = async ({
  userId,
  title,
  content,
}) => {
  if (!userId) {
    throw new Error("Authenticated user is required to create a question");
  }

  const questionHash = crypto.randomBytes(8).toString("hex");

  const insertQuestionSql =
    "INSERT INTO questions (question_hash, user_id, title, content) VALUES (?, ?, ?, ?)";
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

  const insertVectorSql =
    "INSERT INTO question_vectors (question_id, source_text, embedding, status) VALUES (?, ?, ?, ?)";
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

export const getQuestionsService = async ({ search, mine, userId }) => {
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
    baseSql += " WHERE " + whereConditions.join(" AND ");
  }

  baseSql += `
    GROUP BY q.question_id, q.question_hash, q.title, q.content, q.created_at, q.updated_at, u.user_id, u.first_name, u.last_name
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

export const getSingleQuestionService = async ({ questionHash }) => {
  // Fetch the question with author details
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

  // Fetch all answers with author details
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

  // Count answers
  const answerCount = answers.length;

  return {
    success: true,
    message: "Question fetched successfully",
    question: {
      id: question.id,
      questionHash: question.questionHash,
      title: question.title,
      content: question.content,
      answerCount,
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
      total: answerCount,
    },
  };
};
