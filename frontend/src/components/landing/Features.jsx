import React from "react";
import * as Motion from "framer-motion";
import { UserCheck, Monitor, CreditCard, Award } from "lucide-react";

const features = [
  {
    title: "One-Time Face Verification",
    description:
      "Secure identity verification using facial recognition before exams. Ensures the right person is taking the test.",
    icon: UserCheck,
    color: "bg-blue-500",
  },
  {
    title: "Continuous Monitoring",
    description:
      "AI-powered monitoring to ensure fair examinations throughout the duration. Detects suspicious behavior in real-time.",
    icon: Monitor,
    color: "bg-indigo-500",
  },
  {
    title: "Subscription-Based Access",
    description:
      "Flexible plans for students and institutions. Pay for what you use with seamless billing management.",
    icon: CreditCard,
    color: "bg-violet-500",
  },
  {
    title: "Instant Certificates",
    description:
      "Auto-generated certificates with QR verification. Professional credentials delivered immediately after passing.",
    icon: Award,
    color: "bg-teal-500",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need for secure assessments
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Our platform combines cutting-edge AI with a user-friendly interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Motion.motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-slate-100 hover:shadow-md transition"
            >
              <div
                className={`w-12 h-12 ${feature.color} text-white rounded-2xl flex items-center justify-center mb-6`}
              >
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </Motion.motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

