import api from "./api";

/**
 * 🔥 Get Logged-in User Profile
 * GET /users/me
 */
export const getProfile = async () => {
  const response = await api.get("/users/me");
  return response.data;
};


/**
 * ✏️ Update User Profile (only name)
 * PUT /users/update-profile
 */
export const updateProfile = async (data) => {
  const response = await api.put("/users/update-profile", data);
  return response.data;
};


/**
 * ❌ Delete Account
 * DELETE /users/delete-account
 */
export const deleteAccount = async () => {
  const response = await api.delete("/users/delete-account");
  return response.data;
};

/**
 * Change Password for logged-in user
 * POST /users/change-password
 */
export const changePassword = async (data) => {
  const response = await api.post("/users/change-password", data);
  return response.data;
};
