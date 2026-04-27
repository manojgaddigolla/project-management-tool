import axiosInstance from "../api/axios";

export const getProjects = async () => {
  try {
    const response = await axiosInstance.get("/projects");
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const getBoardByProjectId = async (projectId) => {
  try {
    const response = await axiosInstance.get(`/boards/${projectId}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const inviteUserToProject = async (projectId, inviteData) => {
  const response = await axiosInstance.post(
    `/projects/${projectId}/invite`,
    inviteData,
  );
  return response.data;
};
