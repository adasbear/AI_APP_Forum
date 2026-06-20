import { GoogleGenAI } from '@google/genai';
import { ServiceUnavailableError } from '../../../utils/errors/index.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite';

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const buildPrompt = (title, content) => {
  const titleSection = title
    ? `**Title:** ${title}\n`
    : '(No title provided)\n';

  return `You are an expert programming forum coach. Review the following question draft and provide constructive feedback to help the user format and structure their question better.
CRITICAL: Do NOT attempt to answer the user's question or solve their programming problem. Your ONLY goal is to help them ask a better question.

${titleSection}
**Content:** ${content}

Evaluate the draft on:
1. **Clarity** — Is the question easy to understand?
2. **Completeness** — Does it include necessary context, error messages, or code snippets?
3. **Formatting** — Is the structure clear and readable?

Respond in valid JSON with this exact structure:
{
  "feedback": "A paragraph of overall feedback on how to improve the question.",
  "improvedTitle": "A rewritten, improved version of the question title. Make it clear, specific, and searchable. Keep it under 100 characters.",
  "improvedContent": "A rewritten, improved version of the question content with proper markdown formatting. Include clear sections, code blocks if applicable, and better structure. Do NOT answer the question, only improve how it's asked.",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

IMPORTANT: 
- improvedTitle should ONLY contain the improved title text (no "Title:" prefix)
- improvedContent should ONLY contain the improved content/details (no "Content:" prefix)
- Both should be ready to use directly in the form fields`;
};

export const generateQuestionDraftCoachService = async (title, content) => {
  const prompt = buildPrompt(title, content);

  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });
  } catch (error) {
    throw new ServiceUnavailableError(
      `AI service error: ${error.message}`,
    );
  }

  const text = response?.text;

  if (!text) {
    throw new ServiceUnavailableError(
      'AI service returned an empty response',
    );
  }

  // Strip possible markdown code fences around JSON
  const jsonStr = text.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new ServiceUnavailableError(
      'Failed to parse AI response into structured feedback',
    );
  }

  return {
    feedback: parsed.feedback || 'No feedback provided.',
    improvedTitle: parsed.improvedTitle || title || '',
    improvedContent: parsed.improvedContent || content,
    tips: Array.isArray(parsed.tips) ? parsed.tips : [],
  };
};
