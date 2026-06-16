import { apiClient } from './api.client';

export const getQuestions = async (filters = {}, userId = null) => {
  try {
    const params = {};
    
    if (filters.mine && userId) {
      params.mine = 'true';
    }
    
    const response = await apiClient.get('/api/questions', { params });
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};