import api from "./api";

const PRACTICE_BASE = "/practice";

const practiceService = {
  getCategories: async () => {
    const response = await api.get(`${PRACTICE_BASE}/categories`);
    return response.data;
  },

  startPractice: async (categoryId) => {
    const response = await api.post(`${PRACTICE_BASE}/start`, null, {
      params: { category_id: categoryId }
    });

    return response.data;
  },

  getQuestionsByCategory: async (categoryId, limit = 5, attemptId = null) => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (attemptId !== null && attemptId !== undefined) {
      params.set("attempt_id", String(attemptId));
    }

    const response = await api.get(`${PRACTICE_BASE}/${categoryId}?${params.toString()}`);
    return response.data;
  },

  getAttemptReview: async (attemptId) => {
    const response = await api.get(`${PRACTICE_BASE}/attempts/${attemptId}/review`);
    return response.data;
  },

  submitPractice: async (
    attemptId,
    questions,
    selectedAnswers,
    questionTimes = [],
    submitReason = "manual"
  ) => {
    const formattedAnswers = questions.map((question, index) => ({
      question_id: question.id,
      selected_option: Number.isInteger(selectedAnswers[index]) ? selectedAnswers[index] : 0
    }));

    const payload = {
      attempt_id: attemptId,
      answers: formattedAnswers,
      question_times: questions.map((_, index) => Math.max(0, Number(questionTimes[index]) || 0)),
      submit_reason: submitReason
    };

    const response = await api.post(`${PRACTICE_BASE}/submit`, payload);
    return response.data;
  }
};

export default practiceService;
