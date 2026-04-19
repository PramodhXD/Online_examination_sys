import api from "./api";

export const getNotifications = async (limit = 20) => {
  const response = await api.get("/notifications", {
    params: { limit },
  });
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};
