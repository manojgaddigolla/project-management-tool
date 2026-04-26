import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getActivitiesForProject = async (projectId) => {
  const response = await axios.get(`${API_URL}/activities/${projectId}`);
  return response.data;
};