import api from "./api";

const assessmentService = {

  getAssessments: async () => {
    const response = await api.get("/assessments/");
    return response.data;
  },

  getQuestions: async (categoryId, limit = 60) => {
    const response = await api.get(
      `/assessments/${categoryId}/questions?limit=${limit}`
    );
    return response.data;
  },

  startAssessment: async (categoryId) => {
    const response = await api.post(
      `/assessments/start/${categoryId}`
    );
    return response.data;
  },

  submitAssessment: async (payload) => {
    const response = await api.post(
      "/assessments/submit",
      payload
    );
    return response.data;
  },
};

export default assessmentService;
