import { apiClient } from "../core/api.client.js";

/**
 * Get all questions
 */
async function getQuestions({ search, page, limit } = {}) {
  try {
    const params = {};

    if (search) {
      params.search = search;
    }
    if (page) {
      params.page = page;
    }
    if (limit) {
      params.limit = limit;
    }

    const response = await apiClient.get("/api/questions", {
      params,
    });

    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Get single question by hash
 */
async function getSingleQuestion(questionHash) {
  try {
    const response = await apiClient.get(
      `/api/questions/${questionHash}`
    );

    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Semantic AI search for questions
 * @param {string} query
 */
async function searchQuestionsSemantic(query) {
  try {
    const response = await apiClient.get(
      "/api/questions/search",
      {
        params: { query },
      }
    );

    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Update a question (author only)
 * @param {string} questionHash 
 * @param {object} data - { title, content }
 */
async function updateQuestion(questionHash, data) {
  try {
    const response = await apiClient.put(
      `/api/questions/${questionHash}`,
      data
    );
    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Delete a question (author only)
 * @param {string} questionHash 
 */
async function deleteQuestion(questionHash) {
  try {
    const response = await apiClient.delete(
      `/api/questions/${questionHash}`
    );
    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Get similar questions
 */
async function getSimilarQuestions(questionHash) {
  try {
    const response = await apiClient.get(
      `/api/questions/${questionHash}/similar`
    );

    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Create a new question
 * @param {Object} questionData
 */
async function createQuestion(questionData) {
  try {
    const response = await apiClient.post(
      "/api/questions",
      questionData
    );

    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Generate AI feedback for question draft
 * @param {Object} draftData
 */
async function generateQuestionDraftCoach(draftData) {
  try {
    const response = await apiClient.post(
      "/api/questions/draft-coach",
      draftData
    );

    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Centralized error handler
 */
function handleQuestionError(error) {
  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return new Error(
        "Request timed out. Please try again."
      );
    }

    return new Error(
      "Unable to connect to server. Please check your internet connection."
    );
  }

  const backendMessage =
    error.response.data?.msg ||
    error.response.data?.message ||
    error.response.data?.error;

  return new Error(
    backendMessage || "An unexpected error occurred."
  );
}

export const questionService = {
  getQuestions,
  getSingleQuestion,
  searchQuestionsSemantic,
  getSimilarQuestions,
  createQuestion,
  generateQuestionDraftCoach,
  updateQuestion,
  deleteQuestion,
};