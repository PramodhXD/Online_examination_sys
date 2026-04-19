import api from "./api";

const adminService = {
  getDashboardStats: async () => {
    const res = await api.get("/admin/dashboard");
    return res.data;
  },

  getStudents: async (params) => {
    const res = await api.get("/admin/students", { params });
    return res.data;
  },

  toggleStudentBlock: async (studentId) => {
    const res = await api.patch(`/admin/students/${studentId}/block`);
    return res.data;
  },

  deleteStudent: async (studentId) => {
    const res = await api.delete(`/admin/students/${studentId}`);
    return res.data;
  },

  getStudentResults: async (studentId) => {
    const res = await api.get(`/admin/students/${studentId}/results`);
    return res.data;
  },

  issueStudentCertificates: async (studentId) => {
    const res = await api.post(`/admin/students/${studentId}/certificates/issue`);
    return res.data;
  },

  getEligibleCertificates: async ({ search = "", student_id, only_pending = true } = {}) => {
    const params = { search, only_pending };
    if (student_id !== undefined && student_id !== null && student_id !== "") {
      params.student_id = student_id;
    }
    const res = await api.get("/admin/certificates/eligible", { params });
    return res.data;
  },

  issueCertificateAttempt: async (attemptId) => {
    const res = await api.post(`/admin/certificates/${attemptId}/issue`);
    return res.data;
  },

  getExams: async (search = "", examType = "assessment") => {
    const res = await api.get("/admin/exams", { params: { search, exam_type: examType } });
    return res.data;
  },

  getProgrammingExams: async (search = "") => {
    const res = await api.get("/admin/programming-exams", { params: { search } });
    return res.data;
  },

  getProgrammingExam: async (examId) => {
    const res = await api.get(`/admin/programming-exams/${examId}`);
    return res.data;
  },

  getProgrammingExamAssignments: async (examId, search = "") => {
    const res = await api.get(`/admin/programming-exams/${examId}/assignments`, {
      params: { search },
    });
    return res.data;
  },

  updateProgrammingExamAssignments: async (examId, payload) => {
    const res = await api.put(`/admin/programming-exams/${examId}/assignments`, payload);
    return res.data;
  },

  createProgrammingExam: async (payload) => {
    const res = await api.post("/admin/programming-exams", payload);
    return res.data;
  },

  updateProgrammingExam: async (examId, payload) => {
    const res = await api.put(`/admin/programming-exams/${examId}`, payload);
    return res.data;
  },

  deleteProgrammingExam: async (examId) => {
    const res = await api.delete(`/admin/programming-exams/${examId}`);
    return res.data;
  },

  createExam: async (payload) => {
    const res = await api.post("/admin/exams", payload);
    return res.data;
  },

  updateExam: async (examId, payload) => {
    const res = await api.put(`/admin/exams/${examId}`, payload);
    return res.data;
  },

  deleteExam: async (examId) => {
    const res = await api.delete(`/admin/exams/${examId}`);
    return res.data;
  },

  checkExamTimeLimit: async (examId) => {
    const res = await api.get(`/admin/exams/${examId}/time-check`);
    return res.data;
  },

  getExamAssignments: async (examId, search = "") => {
    const res = await api.get(`/admin/exams/${examId}/assignments`, {
      params: { search },
    });
    return res.data;
  },

  updateExamAssignments: async (examId, payload) => {
    const res = await api.put(`/admin/exams/${examId}/assignments`, payload);
    return res.data;
  },

  getQuestions: async (params) => {
    const res = await api.get("/admin/questions", { params });
    return res.data;
  },

  createQuestion: async (payload) => {
    const res = await api.post("/admin/questions", payload);
    return res.data;
  },

  createQuestionsBulk: async (items) => {
    const res = await api.post("/admin/questions/bulk", items);
    return res.data;
  },

  updateQuestion: async (questionId, payload) => {
    const res = await api.put(`/admin/questions/${questionId}`, payload);
    return res.data;
  },

  deleteQuestion: async (questionId) => {
    const res = await api.delete(`/admin/questions/${questionId}`);
    return res.data;
  },

  getLiveSessions: async (search = "") => {
    const res = await api.get("/admin/live", { params: { search } });
    return res.data;
  },

  flagSession: async (sessionId) => {
    const res = await api.patch(`/admin/live/${sessionId}/flag`);
    return res.data;
  },

  stopSession: async (sessionId) => {
    const res = await api.patch(`/admin/live/${sessionId}/stop`);
    return res.data;
  },

  getAnalytics: async () => {
    const res = await api.get("/admin/analytics");
    return res.data;
  },

  getLogs: async (params) => {
    const res = await api.get("/admin/logs", { params });
    return res.data;
  },

  getSupportLogs: async (params) => {
    const res = await api.get("/admin/support-logs", { params });
    return res.data;
  },

  getTickets: async (params) => {
    const res = await api.get("/admin/tickets", { params });
    return res.data;
  },

  getTicketDetail: async (ticketId) => {
    const res = await api.get(`/admin/tickets/${ticketId}`);
    return res.data;
  },

  updateTicketStatus: async (ticketId, payload) => {
    const res = await api.patch(`/admin/tickets/${ticketId}/status`, payload);
    return res.data;
  },

  replyTicket: async (ticketId, payload) => {
    const res = await api.post(`/admin/tickets/${ticketId}/replies`, payload);
    return res.data;
  },

  replyAndUpdateTicket: async (ticketId, payload) => {
    const res = await api.put(`/admin/tickets/${ticketId}/reply`, payload);
    return res.data;
  },

  generateLogReport: async () => {
    const res = await api.post("/admin/logs/generate");
    return res.data;
  },

  getSettings: async () => {
    const res = await api.get("/admin/settings");
    return res.data;
  },

  updateSettings: async (items) => {
    const res = await api.put("/admin/settings", { items });
    return res.data;
  },
};

export default adminService;
