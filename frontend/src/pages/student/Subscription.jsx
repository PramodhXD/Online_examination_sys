import { useEffect, useMemo, useState } from "react";
import { CheckCircle, CreditCard } from "lucide-react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import subscriptionService from "../../services/subscriptionService";
import { getErrorMessage } from "../../utils/errorMessage";

const plans = [
  {
    name: "FREE",
    label: "Free",
    price: "INR 0",
    period: "/month",
    features: [
      "2 assessment attempts per month",
      "Practice tests and basic dashboard",
      "No certificates",
      "No leaderboard access",
      "No PDF report downloads",
    ],
  },
  {
    name: "PRO",
    label: "Pro",
    price: "INR 499",
    period: "/month",
    features: [
      "Unlimited assessment attempts",
      "Assessment certificates enabled",
      "Leaderboard access enabled",
      "Full analytics dashboard",
      "No PDF report downloads",
    ],
  },
  {
    name: "PREMIUM",
    label: "Premium",
    price: "INR 999",
    period: "/month",
    features: [
      "Everything in Pro",
      "PDF performance report downloads",
      "Priority support",
      "Advanced tracking features",
    ],
  },
];

function getAuthUser() {
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function amountLabel(amount) {
  return `INR ${(Number(amount || 0) / 100).toFixed(2)}`;
}

export default function Subscription() {
  const [currentPlan, setCurrentPlan] = useState("FREE");
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState("UPI");
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        setLoading(true);
        const data = await subscriptionService.getSubscription();
        setCurrentPlan(String(data?.plan || "FREE").toUpperCase());
      } catch {
        setError("Failed to load subscription details.");
      } finally {
        setLoading(false);
      }
    };
    loadSubscription();
  }, []);

  const planDetails = useMemo(
    () => plans.find((plan) => plan.name === currentPlan) || plans[0],
    [currentPlan]
  );

  const persistLocalPlan = (updatedPlan) => {
    try {
      const raw = localStorage.getItem("auth_user");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.subscription_plan = updatedPlan;
      localStorage.setItem("auth_user", JSON.stringify(parsed));
    } catch {
      void 0;
    }
  };

  const handlePlanChange = async (planName) => {
    if (planName === currentPlan) return;
    setError("");
    setSuccess("");
    setUpdatingPlan(planName);

    try {
      if (planName === "FREE") {
        const data = await subscriptionService.updateSubscription(planName);
        const updated = String(data?.plan || planName).toUpperCase();
        setCurrentPlan(updated);
        persistLocalPlan(updated);
        setSuccess(`Subscription updated to ${updated}.`);
        return;
      }

      const order = await subscriptionService.createRazorpayOrder(planName);
      setCheckoutOrder(order);
      setCheckoutMethod("UPI");
      setCheckoutOpen(true);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to start payment."));
    } finally {
      setUpdatingPlan(null);
    }
  };

  const handlePayNow = async () => {
    if (!checkoutOrder) return;
    setProcessingPayment(true);
    setError("");

    try {
      const payment = await subscriptionService.confirmRazorpayPayment(
        checkoutOrder.plan,
        checkoutOrder.order_id
      );

      const verified = await subscriptionService.verifyRazorpayPayment({
        plan: checkoutOrder.plan,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      });

      const updated = String(verified?.plan || checkoutOrder.plan).toUpperCase();
      setCurrentPlan(updated);
      persistLocalPlan(updated);
      setSuccess(`Payment successful. Subscription upgraded to ${updated}.`);
      setCheckoutOpen(false);
      setCheckoutOrder(null);
    } catch (err) {
      setError(getErrorMessage(err, "Payment failed. Please try again."));
    } finally {
      setProcessingPayment(false);
    }
  };

  const authUser = getAuthUser();

  return (
    <DashboardLayout title="Subscription">
      <div className="max-w-6xl mx-auto relative">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Subscription Plans</h2>
          <p className="text-slate-600 mt-2">Manage your Free, Pro, and Premium plan access.</p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Loading subscription...</div>
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm">
              Current plan: <strong>{planDetails.label}</strong>
            </div>

            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
            ) : null}
            {success ? (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700 text-sm">{success}</div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrent = currentPlan === plan.name;
                return (
                  <div
                    key={plan.name}
                    className={`rounded-2xl border p-6 bg-white ${
                      plan.name === "PRO" ? "border-blue-500 shadow-md" : "border-slate-200"
                    }`}
                  >
                    <h3 className="text-xl font-semibold text-slate-900">{plan.label}</h3>
                    <div className="mt-3 mb-5">
                      <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                      <span className="text-slate-500 ml-1">{plan.period}</span>
                    </div>

                    <ul className="space-y-3 min-h-[170px]">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handlePlanChange(plan.name)}
                      disabled={isCurrent || updatingPlan === plan.name}
                      className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        isCurrent
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {isCurrent ? "Current Plan" : updatingPlan === plan.name ? "Processing..." : `Switch to ${plan.label}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {checkoutOpen && checkoutOrder ? (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  <p className="font-semibold">Razorpay Secure Checkout</p>
                </div>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">SECURE</span>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <p className="text-sm text-slate-500">Paying for</p>
                  <p className="font-semibold text-slate-900">{checkoutOrder.plan} Plan</p>
                  <p className="text-sm text-slate-500 mt-1">Amount: {amountLabel(checkoutOrder.amount)}</p>
                  <p className="text-xs text-slate-400 mt-1">Order ID: {checkoutOrder.order_id}</p>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-800 mb-2">Account</p>
                  <p className="text-sm text-slate-700">{authUser?.name || "User"}</p>
                  <p className="text-xs text-slate-500">{authUser?.email || ""}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-2">Payment Method</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["UPI", "Card", "Netbanking"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setCheckoutMethod(method)}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          checkoutMethod === method
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 text-slate-700"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!processingPayment) {
                        setCheckoutOpen(false);
                        setCheckoutOrder(null);
                      }
                    }}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                    disabled={processingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePayNow}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    disabled={processingPayment}
                  >
                    {processingPayment ? "Processing..." : "Pay Now"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
