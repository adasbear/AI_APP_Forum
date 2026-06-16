import { apiClient } from './api.client';

export const getQuestions = async (filters = {}, userId = null) => {
  try {
    const params = new URLSearchParams();
    
    // If filters.mine is true, add ?mine=true and user_id
    if (filters.mine && userId) {
      params.append('mine', 'true');
      params.append('userId', userId);
    }
    
    const response = await apiClient.get(`/api/questions?${params.toString()}`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};