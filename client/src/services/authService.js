import api from './api';

const toApiError = (error) => {
  return error.response ? error.response.data : { msg: error.message };
};

export const register = async (userData) => {
  try {
    const response = await api.post('/users/register', userData);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const loadUser = async () => {
  try {
    const response = await api.get('/auth');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
};
