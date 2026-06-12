import { apiClient } from './api.client';

// Mock data matching T-10 response format
const mockQuestions = [
  {
    id: 1,
    questionHash: "abc123def456",
    title: "How do I learn React?",
    content: "I'm a beginner wanting to learn React from scratch.",
    answerCount: 2,
    createdAt: "2025-06-11T10:30:00Z",
    updatedAt: "2025-06-11T10:30:00Z",
    author: {
      id: 1,
      firstName: "John",
      lastName: "Doe"
    }
  },
  {
    id: 2,
    questionHash: "xyz789abc123",
    title: "What is JavaScript?",
    content: "I'm confused about JavaScript vs Java.",
    answerCount: 3,
    createdAt: "2025-06-10T15:20:00Z",
    updatedAt: "2025-06-10T15:20:00Z",
    author: {
      id: 1,
      firstName: "John",
      lastName: "Doe"
    }
  }
];

export const getQuestions = async (filters = {}) => {
  try {
    // For now, return mock data
    if (filters.mine) {
      return mockQuestions;
    }
    
    // In future: call real API when T-10 is ready
    // const response = await apiClient.get(`/questions?${params.toString()}`);
    // return response.data.data || [];
    
    return mockQuestions;
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};