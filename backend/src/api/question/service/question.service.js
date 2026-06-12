import crypto from "crypto";
import { safeExecute } from "../../../../db/config.js";
import { BadRequestError, NotFoundError } from "../../../utils/errors/index.js";
import { normalizeQuestionText } from "./vector.service.js";
import { storeQuestionVector } from "./vector.service.js";
import { generateQuestionEmbedding } from "./vector.service.js";

const generateQuestionHash = () => crypto.randomBytes(8).toString("hex");

export const createQuestionWithVectorService = async (payload) => {
  //extract required fields from the payload
  const { userId, title, content } = payload;

  //insert the question into the database
  const insertQuestionSql = `INSERT INTO questions (question_hash, user_id, title, content) VALUES (?, ?, ?, ?)`;

  //generate a unique hash for the question
  const questionHash = generateQuestionHash();
  let questionResult;

  try {
    questionResult = await safeExecute(insertQuestionSql, [
      questionHash,
      userId,
      title,
      content,
    ]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      throw new BadRequestError("User does not exist");
    }
    throw error;
  }

  const questionId = questionResult.insertId;

  const creationResult = {
    id: questionId,
    questionHash,
    title,
    content,
    userId,
  };

  const sourceText = normalizeQuestionText({ title: payload.title });

  //generate vector embedding for the question
  try {
    const embeddingResult = await generateQuestionEmbedding(sourceText, {
      questionId: creationResult.id,
    });

    await storeQuestionVector({
      questionId: creationResult.id,
      sourceText,
      embedding: embeddingResult.embedding,
      status: "ready",
    });
  } catch (error) {
    console.error("===FAILED TO STORE VECTOR FOR QUESTION===");
    console.error("Question ID:", creationResult.id);
    console.error("Operation: question creation");
    console.error("Error:", error);
    console.error("==========================================");

    await storeQuestionVector({
      questionId: creationResult.id,
      sourceText,
      embedding: [],
      status: "failed",
    }).catch((e) => console.error("failed to save failed status:", e));
  }

  return {
    question: creationResult,
  };
};
