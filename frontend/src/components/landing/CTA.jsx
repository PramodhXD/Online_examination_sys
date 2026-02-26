import React from 'react';

export const CTASection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-indigo-600 rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 0 L100 0 L100 100 L0 100 Z" fill="url(#grid)" />
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
            </svg>
          </div>
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 sm:text-5xl">
              Start Secure Online Exams Today
            </h2>
            <p className="text-indigo-100 text-lg mb-10 leading-relaxed">
              Join thousands of students and institutions already using SecureExam to conduct fair and verified assessments worldwide.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="px-10 py-5 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition-all text-lg shadow-xl shadow-indigo-900/20">
                Create Account
              </button>
              <button className="px-10 py-5 bg-indigo-700 text-white font-bold rounded-2xl hover:bg-indigo-800 transition-all text-lg">
                Talk to Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
