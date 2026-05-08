import axiosInstance from "../api/axios";

export const createCard = async (cardData) => {
  const response = await axiosInstance.post("/cards", cardData);
  return response.data;
};

export const updateCard = async (cardId, cardData) => {
  const response = await axiosInstance.put(`/cards/${cardId}`, cardData);
  return response.data;
};

export const deleteCard = async (cardId, data = {}) => {
  const response = await axiosInstance.delete(`/cards/${cardId}`, { data });
  return response.data;
};

export const moveCard = async (cardId, moveData) => {
  const response = await axiosInstance.put(`/cards/move/${cardId}`, moveData);
  return response.data;
};

export const addComment = async (cardId, commentData) => {
  const response = await axiosInstance.post(    `/cards/${cardId}/comments`,
    commentData,
  );
  return response.data;
};
export const assignUsersToCard = async (cardId, assignmentData) => {
  const response = await axiosInstance.put(
    `/cards/${cardId}/assign`,
    assignmentData,
  );
  return response.data;
};

export const generateAISubtasks = async (cardId, payload) => {
  const response = await axiosInstance.post(`/cards/${cardId}/ai-subtasks`, payload);
  return response.data;
};
