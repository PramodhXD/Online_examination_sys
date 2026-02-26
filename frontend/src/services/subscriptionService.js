import api from "./api";

const subscriptionService = {
  getSubscription: async () => {
    const response = await api.get("/users/subscription");
    return response.data;
  },

  updateSubscription: async (plan) => {
    const response = await api.put("/users/subscription", { plan });
    return response.data;
  },

  createRazorpayOrder: async (plan) => {
    const response = await api.post("/users/subscription/razorpay/order", { plan });
    return response.data;
  },

  confirmRazorpayPayment: async (plan, orderId) => {
    const response = await api.post("/users/subscription/razorpay/confirm", {
      plan,
      order_id: orderId,
    });
    return response.data;
  },

  verifyRazorpayPayment: async (payload) => {
    const response = await api.post("/users/subscription/razorpay/verify", payload);
    return response.data;
  },
};

export default subscriptionService;
