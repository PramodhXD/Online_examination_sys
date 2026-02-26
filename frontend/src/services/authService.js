import api from "./api";

/* LOGIN */
export const loginUser = (data) =>
  api.post("/auth/login", data).then(res => res.data);

/* REGISTER */
export const registerUser = (data) =>
  api.post("/auth/register", data).then(res => res.data);

/* CURRENT USER */
export const getCurrentUser = () =>
  api.get("/users/me").then(res => res.data);

/* FORGOT PASSWORD */
export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email });

/* VERIFY OTP */
export const verifyOtp = (payloadOrEmail, otp) => {
  const payload =
    typeof payloadOrEmail === "object"
      ? payloadOrEmail
      : { email: payloadOrEmail, otp };
  return api.post("/auth/verify-otp", payload);
};

/* RESET PASSWORD */
export const resetPassword = (payloadOrEmail, newPassword) => {
  const payload =
    typeof payloadOrEmail === "object"
      ? payloadOrEmail
      : { email: payloadOrEmail, new_password: newPassword };
  return api.post("/auth/reset-password", payload);
};

/* FACE UPLOAD */
export const uploadFaceImages = (payload) =>
  api.post("/upload", payload).then(res => res.data);

/* CREATE TEMPLATE */
export const createFaceTemplate = (email) =>
  api.post(`/create-template?email=${encodeURIComponent(email)}`)
     .then(res => res.data);

/* VERIFY FACE */
export const verifyFace = (payload) =>
  api.post("/verify", payload).then(res => res.data);


/* CONTINUOUS MONITOR VERIFY */
export const verifyMonitor = (payload) =>
  api.post("/verify-monitor", payload).then(res => res.data);
