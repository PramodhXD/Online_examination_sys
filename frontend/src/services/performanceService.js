import api from "./api";

const performanceService = {
  getHistory: async () => {
    const response = await api.get("/dashboard/performance");
    return response.data;
  },
};

export default performanceService;
