import { apiClient } from '../core/api.client.js';

/**
 * Service for handling question-related API requests.
 */
async function getQuestions({ search } = {}) {
  try {
    const params = {};
    if (search) {
      params.search = search;
    }
    const response = await apiClient.get('/api/questions', { params });
    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Runs an AI-powered semantic search query on questions.
 * @param {string} query - The search query (min 5 characters recommended).
 */
async function searchQuestionsSemantic(query) {
  try {
    const response = await apiClient.get('/api/questions/search', {
      params: { query },
    });
    return response.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Centralized error handler for question service requests.
 */
function handleQuestionError(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timed out. Please try again.');
    }
    return new Error(
      'Unable to connect to server. Please check your internet connection.',
    );
  }

  const backendMessage =
    error.response.data?.msg ||
    error.response.data?.message ||
    error.response.data?.error;

  return new Error(backendMessage || 'An unexpected error occurred.');
}

export const questionService = {
  getQuestions,
  searchQuestionsSemantic,
};
