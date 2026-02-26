import React from "react";
import { Shield, Check, UserCheck } from "lucide-react";
import * as Motion from "framer-motion";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "./ImageWithFallback";

function Hero() {
  return (
    <section className="relative bg-white pt-16 pb-24 lg:pt-32 lg:pb-48 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-24 items-center">

          {/* ================= LEFT CONTENT ================= */}
          <div className="lg:col-span-6 text-left">

            {/* Trust Badge */}
            <Motion.motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 mb-10"
            >
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Privacy-First | AI-Verified | Exam-Safe
              </span>
            </Motion.motion.div>

            {/* Heading */}
            <Motion.motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-8"
            >
              Secure Online Exams,
              <span className="block text-indigo-600">
                Powered by AI Face Verification
              </span>
            </Motion.motion.h1>

            {/* Description */}
            <Motion.motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-slate-600 mb-12 max-w-xl"
            >
              A secure online examination platform that verifies student identity
              using facial recognition, ensures fair exams, and generates instant
              digital certificates.
            </Motion.motion.p>

            {/* CTA Buttons (Linked) */}
            <Motion.motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex gap-5 mb-14 flex-wrap"
            >
              <Link
                to="/register"
                className="px-10 py-5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition shadow-xl inline-flex items-center justify-center"
              >
                Start Secure Exam
              </Link>

              <Link
                to="/login"
                className="px-10 py-5 border-2 border-indigo-600 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition inline-flex items-center justify-center"
              >
                View How It Works
              </Link>
            </Motion.motion.div>

            {/* Trust Points */}
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Check className="w-4 h-4 text-green-600" />
                No raw face images stored
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Check className="w-4 h-4 text-green-600" />
                One-time verification
              </div>
            </div>
          </div>

          {/* ================= RIGHT MOCKUP ================= */}
          <div className="lg:col-span-6 mt-20 lg:mt-0 relative">
            <Motion.motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative mx-auto max-w-2xl"
            >
              <div className="bg-slate-800 rounded-[2.5rem] p-4 shadow-2xl">
                <div className="aspect-[16/10] bg-white rounded-lg relative overflow-hidden">

                  {/* Face Verification Overlay */}
                  <div className="absolute top-6 right-6 w-36 aspect-square bg-white rounded-xl shadow-lg overflow-hidden">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1733433136919-70a099fe49d1"
                      alt="Face verification"
                      className="w-full h-full object-cover grayscale"
                    />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      VERIFIED
                    </div>
                  </div>

                  {/* Status Toast */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2 rounded-full flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    AI MONITORING ACTIVE
                  </div>

                </div>
              </div>
            </Motion.motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

export { Hero };
export default Hero;


