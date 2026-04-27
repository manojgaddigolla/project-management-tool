import axiosInstance from "../api/axios";

export const moveCard = async (cardId, moveData) => {
  const response = await axiosInstance.put(`/cards/move/${cardId}`, moveData);
  return response.data;
};

export const addComment = async (cardId, commentData) => {
  const response = await axiosInstance.post(
    `/cards/${cardId}/comments`,
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
