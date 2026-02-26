import React from "react";
import { Lock, ShieldCheck, Cpu, EyeOff } from "lucide-react";

export const TrustSecurity = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

        <div className="relative overflow-hidden rounded-[3rem] bg-indigo-900 px-10 py-16 sm:px-16 sm:py-20">

          {/* Decorative gradients */}
          <div className="pointer-events-none absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-indigo-500/30 rounded-full blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/30 rounded-full blur-[120px]" />

          <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">

            {/* Left content */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Built on Trust & Modern Security
              </h2>

              <p className="text-indigo-100 text-lg leading-relaxed mb-10 max-w-xl">
                We believe security shouldn't come at the cost of privacy. Our
                system uses advanced encryption and local-first AI processing to
                ensure a safe and compliant examination environment.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-indigo-200" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Privacy-First Design
                    </h4>
                    <p className="text-sm text-indigo-200/80">
                      Data is encrypted and anonymized by default.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <EyeOff className="w-6 h-6 text-indigo-200" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      No Raw Storage
                    </h4>
                    <p className="text-sm text-indigo-200/80">
                      We never store raw facial images on our servers.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-indigo-200" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Secure Data Handling
                    </h4>
                    <p className="text-sm text-indigo-200/80">
                      Compliant with SOC2 and GDPR standards.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-indigo-200" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Local AI Processing
                    </h4>
                    <p className="text-sm text-indigo-200/80">
                      Real-time analysis without external uploads.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right visual */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-indigo-500/30 flex items-center justify-center">
                  <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-indigo-400/50 flex items-center justify-center animate-pulse">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <ShieldCheck className="w-16 h-16 sm:w-20 sm:h-20 text-indigo-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
