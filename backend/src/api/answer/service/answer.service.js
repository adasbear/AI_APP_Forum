import { safeExecute } from "../../../../db/config.js";
import { BadRequestError, NotFoundError } from "../../../utils/errors/index.js";

export const createAnswerService = async ({ questionId, content, userId }) => {
  // 1. Check question exists
  const questionSql =
    "SELECT question_id, user_id FROM questions WHERE question_id = ?";

  const questions = await safeExecute(questionSql, [questionId]);

  if (questions.length === 0) {
    throw new NotFoundError("Question not found");
  }

  const question = questions[0];

  // 2. Prevent answering own question
  if (question.user_id === userId) {
    throw new BadRequestError("You cannot answer your own question");
  }

  // 3. Insert answer
  const insertSql =
    "INSERT INTO answers (question_id, user_id, content) VALUES (?, ?, ?)";

  const result = await safeExecute(insertSql, [questionId, userId, content]);

  // 4. Fetch inserted answer
  const fetchSql = `
    SELECT 
      a.answer_id AS id,
      a.question_id AS questionId,
      a.content,
      a.created_at AS createdAt,
      a.updated_at AS updatedAt,
      u.user_id AS authorId,
      u.first_name AS firstName,
      u.last_name AS lastName
    FROM answers a
    JOIN users u ON a.user_id = u.user_id
    WHERE a.answer_id = ?
  `;

  const rows = await safeExecute(fetchSql, [result.insertId]);

  const answer = rows[0];

  return {
    id: answer.id,
    questionId: answer.questionId,
    content: answer.content,
    createdAt: answer.createdAt,
    updatedAt: answer.updatedAt,
    author: {
      id: answer.authorId,
      firstName: answer.firstName,
      lastName: answer.lastName,
    },
  };
};
