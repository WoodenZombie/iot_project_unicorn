import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const createSession = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/sessions`);
    return response.data;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const stopSession = async (sessionId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/stop`);
    return response.data;
  } catch (error) {
    console.error('Error stopping session:', error);
    throw error;
  }
};

export const getTranscript = async (sessionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}/transcript`);
    return response.data;
  } catch (error) {
    console.error('Error getting transcript:', error);
    throw error;
  }
};