import api from "./api";

const practiceService = {

  // =====================================================
  // ✅ Get all practice categories
  // =====================================================
  getCategories: async () => {
    const response = await api.get("/practice/categories");
    return response.data;
  },


  // =====================================================
  // ✅ Start Practice Attempt (JWT based)
  // =====================================================
  startPractice: async (categoryId) => {
    const response = await api.post("/practice/start", null, {
      params: { category_id: categoryId }
    });

    return response.data;  // { attempt_id: number }
  },


  // =====================================================
  // ✅ Get random questions by category
  // =====================================================
  getQuestionsByCategory: async (categoryId, limit = 5) => {
    const response = await api.get(
      `/practice/${categoryId}?limit=${limit}`
    );
    return response.data;
  },


  // =====================================================
  // ✅ Submit practice answers (WITH attempt_id)
  // =====================================================
  submitPractice: async (attemptId, questions, selectedAnswers) => {

    const formattedAnswers = questions.map((question, index) => ({
      question_id: question.id,
      selected_option: selectedAnswers[index]
    }));

    const payload = {
      attempt_id: attemptId,   // ✅ REQUIRED NOW
      answers: formattedAnswers
    };

    const response = await api.post("/practice/submit", payload);
    return response.data;
  }

};

export default practiceService;
