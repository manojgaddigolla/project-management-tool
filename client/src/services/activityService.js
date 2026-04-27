import axiosInstance from '../api/axios';

export const getActivitiesForProject = async (projectId) => {
  const response = await axiosInstance.get(`/activities/${projectId}`);
  return response.data;
};