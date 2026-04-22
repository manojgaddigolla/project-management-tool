import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const moveCard = async (cardId, moveData) => {
  return axios.put(`${API_URL}/cards/move/${cardId}`, moveData);
};
