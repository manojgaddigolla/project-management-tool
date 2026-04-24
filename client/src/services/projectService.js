import api from "./api";

export const getProjects = async () => {
  try {
    const response = await api.get("/projects");
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

 export const getBoardByProjectId = async (projectId) => {
   try {
     const response = await api.get(`/boards/${projectId}`);
     return response.data;
   } catch (error) {
     throw error.response.data;
   }
 };

 export const inviteUserToProject = async (projectId, inviteData) => {
  const response = await axios.post(
    `${API_URL}/projects/${projectId}/invite`,
    inviteData
  );
  return response.data;
};