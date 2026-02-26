import api from "./api";

const dashboardService = {
  getDashboard: async () => {
    const response = await api.get("/dashboard/");
    return response.data;
  },

  getLeaderboard: async (scope = "all", limit = 20) => {
    const response = await api.get("/dashboard/leaderboard", {
      params: { scope, limit },
    });
    return response.data;
  },

  downloadReportPdf: async () => {
    const response = await api.get("/dashboard/report-pdf", {
      responseType: "blob",
    });
    return response.data;
  },
};

export default dashboardService;
