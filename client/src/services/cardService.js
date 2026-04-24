import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const moveCard = async (cardId, moveData) => {
  return axios.put(`${API_URL}/cards/move/${cardId}`, moveData);
};

export const addComment = async (cardId, commentData) => {
  const response = await axios.post(
    `${API_URL}/cards/${cardId}/comments`,
    commentData,
  );
  return response.data;
};

export const assignUsersToCard = async (cardId, assignmentData) => {
  const response = await axios.put(
    `${API_URL}/cards/${cardId}/assign`,
    assignmentData,
  );
  return response.data;
};
