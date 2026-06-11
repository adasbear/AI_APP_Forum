import { apiClient } from '../core/api.client.js';

async function assessAnswerFit(questionHash, answerText) {
  try {
    const response = await apiClient.post(
      `/api/questions/${questionHash}/answer-fit`,
      { answerText },
    );
    return response.data;
  } catch (error) {
    throw handleAnswerError(error);
  }
}

async function postAnswer(questionId, content) {
  try {
    const response = await apiClient.post('/api/answers', {
      questionId,
      content,
    });
    return response.data;
  } catch (error) {
    throw handleAnswerError(error);
  }
}

function handleAnswerError(error) {
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

export const answerService = {
  assessAnswerFit,
  postAnswer,
};
