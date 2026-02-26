import api from "./api";

const certificateService = {
  getAssessmentCertificates: async () => {
    const response = await api.get("/assessments/certificates");
    return response.data;
  },

  downloadAssessmentCertificate: async (attemptId) => {
    const response = await api.get(
      `/assessments/certificates/${attemptId}/download`,
      { responseType: "blob" }
    );
    return response.data;
  },
};

export default certificateService;
