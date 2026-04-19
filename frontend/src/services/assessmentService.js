import api from "./api";

const assessmentService = {

  getAssessments: async () => {
    const response = await api.get("/assessments/");
    return response.data;
  },

  getQuestions: async (categoryId, limit = 60, attemptId = null) => {
    const params = new URLSearchParams();
    if (limit !== null && limit !== undefined) {
      params.set("limit", String(limit));
    }
    if (attemptId !== null && attemptId !== undefined) {
      params.set("attempt_id", String(attemptId));
    }
    const response = await api.get(
      `/assessments/${categoryId}/questions?${params.toString()}`
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

  getAttemptSession: async (attemptId) => {
    const response = await api.get(
      `/assessments/attempts/${attemptId}/session`
    );
    return response.data;
  },

  reportProctoringEvent: async (attemptId, payload) => {
    const response = await api.post(
      `/assessments/attempts/${attemptId}/proctoring`,
      payload
    );
    return response.data;
  },

  getAttemptReview: async (attemptId) => {
    const response = await api.get(
      `/assessments/attempts/${attemptId}/review`
    );
    return response.data;
  },
};

export default assessmentService;
