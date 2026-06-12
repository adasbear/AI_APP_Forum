import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeExecute } from "../../../db/config.js";
import { BadRequestError, UnauthenticatedError } from "../../././utils/errors/index.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_TEXT_MODEL });
/**
 * Evaluates how well an answer addresses a question using AI.
 * 
 * @param {Object} req - Express request
 * @param {string} req.params.questionHash - The question's unique hash
 * @param {string} req.body.answerText - The draft answer to evaluate
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export const evaluateAnswerFit = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { answerText } = req.body;

    // ============ STEP 1: VALIDATE INPUT ============
    if (!answerText || typeof answerText !== "string") {
      throw new BadRequestError("Answer text is required and must be a string.");
    }

    const trimmedAnswer = answerText.trim();
    if (trimmedAnswer.length < 10) {
      throw new BadRequestError("Answer must be at least 10 characters long.");
    }

    if (trimmedAnswer.length > 10000) {
      throw new BadRequestError("Answer must not exceed 10,000 characters.");
    }

    // ============ STEP 2: GET QUESTION FROM DATABASE ============
    const questionSql = `
      SELECT question_id, title, content 
      FROM questions 
      WHERE question_hash = ?
      LIMIT 1
    `;
    const questionRows = await safeExecute(questionSql, [questionHash]);

    if (questionRows.length === 0) {
      throw new BadRequestError("Question not found.");
    }

    const question = questionRows[0];

    // ============ STEP 3: BUILD PROMPT FOR GOOGLE GEMINI ============
    const prompt = `
You are an expert evaluator of Q&A content. Evaluate the following answer against the question.

QUESTION TITLE: ${question.title}

QUESTION CONTENT:
${question.content}

ANSWER TO EVALUATE:
${trimmedAnswer}

Please evaluate this answer by providing:
1. A fit score from 0-10 (how well does it answer the question?)
2. The key strengths of this answer
3. Areas for improvement
4. Specific actionable feedback

Format your response EXACTLY as follows (no other text):
FIT_SCORE: [number]
STRENGTHS: [text]
IMPROVEMENTS: [text]
FEEDBACK: [text]
`;

    // ============ STEP 4: CALL GOOGLE GEMINI API ============
    let evaluationText;
    try {
      const result = await model.generateContent(prompt);
      evaluationText = result.response.text();
    } catch (error) {
      console.error("Google Gemini API Error:", error);
      throw new BadRequestError("Failed to evaluate answer. Please try again.");
    }

    // ============ STEP 5: PARSE AI RESPONSE ============
    const evaluation = parseEvaluation(evaluationText);

    if (!evaluation) {
      throw new BadRequestError("Failed to parse AI evaluation. Please try again.");
    }

    // ============ STEP 6: RETURN RESPONSE ============
    res.status(200).json({
      success: true,
      data: {
        fit_score: evaluation.fitScore,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        feedback: evaluation.feedback,
        question_title: question.title,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Parses the AI response to extract evaluation metrics.
 * 
 * @param {string} text - The raw text response from Google Gemini
 * @returns {Object|null} Parsed evaluation or null if parsing fails
 */
function parseEvaluation(text) {
  try {
    // Extract FIT_SCORE
    const scoreMatch = text.match(/FIT_SCORE:\s*(\d+)/i);
    const fitScore = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    if (fitScore === null || fitScore < 0 || fitScore > 10) {
      return null;
    }

    // Extract STRENGTHS
    const strengthsMatch = text.match(/STRENGTHS:\s*(.+?)(?=IMPROVEMENTS:|$)/is);
    const strengths = strengthsMatch ? strengthsMatch[1].trim() : "";

    // Extract IMPROVEMENTS
    const improvementsMatch = text.match(/IMPROVEMENTS:\s*(.+?)(?=FEEDBACK:|$)/is);
    const improvements = improvementsMatch ? improvementsMatch[1].trim() : "";

    // Extract FEEDBACK
    const feedbackMatch = text.match(/FEEDBACK:\s*(.+?)$/is);
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : "";

    if (!strengths || !improvements || !feedback) {
      return null;
    }

    return {
      fitScore,
      strengths,
      improvements,
      feedback,
    };
  } catch (error) {
    console.error("Parse evaluation error:", error);
    return null;
  }
}