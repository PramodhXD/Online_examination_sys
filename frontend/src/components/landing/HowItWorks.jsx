import React from "react";
import { UserPlus, Camera, BookOpen, FileCheck } from "lucide-react";

const steps = [
  {
    title: "Register & Subscribe",
    description: "Create your account and choose a plan that fits your needs.",
    icon: UserPlus,
  },
  {
    title: "Face Verification",
    description: "Briefly verify your identity using your webcam.",
    icon: Camera,
  },
  {
    title: "Take Exam",
    description: "Complete your assessment in our secure, focused environment.",
    icon: BookOpen,
  },
  {
    title: "Get Results & Certificate",
    description: "Receive instant feedback and a verified digital certificate.",
    icon: FileCheck,
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Four simple steps to a secure and verified examination.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">

          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-slate-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center group"
              >
                {/* Icon circle */}
                <div className="relative w-24 h-24 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center mb-6 transition-all duration-300 group-hover:border-indigo-600 group-hover:bg-indigo-50">
                  
                  {/* Step number */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <step.icon className="w-10 h-10 text-slate-400 transition-colors group-hover:text-indigo-600" />
                </div>

                {/* Text */}
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 max-w-[220px]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
