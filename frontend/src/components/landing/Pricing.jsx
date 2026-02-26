import React from "react";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free Plan",
    price: "$0",
    description: "Perfect for trying out our secure platform.",
    features: [
      "Limited exams (2 / month)",
      "Standard proctoring",
      "No digital certificate",
      "Email support",
    ],
    buttonText: "Start Free",
    highlighted: false,
  },
  {
    name: "Basic Plan",
    price: "$29",
    period: "/month",
    description: "Great for individual students and small groups.",
    features: [
      "Standard exams (10 / month)",
      "Full AI proctoring",
      "Digital certificate included",
      "Priority email support",
    ],
    buttonText: "Choose Basic",
    highlighted: false,
  },
  {
    name: "Premium Plan",
    price: "$99",
    period: "/month",
    description: "Best for educational institutions and organizations.",
    features: [
      "Unlimited exams",
      "Advanced face verification",
      "Certificates + Leaderboard",
      "24/7 dedicated support",
      "Organization dashboard",
    ],
    buttonText: "Get Premium",
    highlighted: true,
  },
];

export const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Choose the plan that's right for your educational goals.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-3xl p-8 border transition-all ${
                plan.highlighted
                  ? "border-indigo-600 ring-2 ring-indigo-600/10 shadow-lg"
                  : "border-slate-200 shadow-sm hover:shadow-md"
              }`}
            >
              {/* Badge */}
              {plan.highlighted && (
                <div className="absolute -top-3 right-6 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full uppercase tracking-wide">
                  Recommended
                </div>
              )}

              {/* Title */}
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-extrabold text-slate-900">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-slate-500">{plan.period}</span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 mb-8 leading-relaxed">
                {plan.description}
              </p>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start text-sm text-slate-700"
                  >
                    <Check className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                className={`w-full py-4 rounded-xl font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                    : "border border-slate-200 text-slate-900 hover:bg-slate-50"
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
