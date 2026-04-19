import api from "./api";

const programmingExamService = {
  getExams: async () => {
    const response = await api.get("/programming-exams/");
    return response.data;
  },

  getExamDetail: async (examId) => {
    const response = await api.get(`/programming-exams/${examId}`);
    return response.data;
  },

  startExam: async (examId) => {
    const response = await api.post(`/programming-exams/${examId}/start`);
    return response.data;
  },

  getAttemptSession: async (attemptId) => {
    const response = await api.get(`/programming-exams/attempts/${attemptId}/session`);
    return response.data;
  },

  saveDraft: async (payload) => {
    const response = await api.post("/programming-exams/attempts/save", payload);
    return response.data;
  },

  submitExam: async (payload) => {
    const response = await api.post("/programming-exams/submit", payload);
    return response.data;
  },
};

export default programmingExamService;
