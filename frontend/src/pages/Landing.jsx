// src/pages/Landing.jsx

import { Navbar } from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import { Features } from "../components/landing/Features";
import { HowItWorks } from "../components/landing/HowItWorks";
import { TrustSecurity } from "../components/landing/TrustSecurity";
import { Pricing } from "../components/landing/Pricing";
import { CTASection } from "../components/landing/CTA";
import { Footer } from "../components/landing/Footer";

export default function Landing() {
  return (
    <main className="w-full overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <TrustSecurity />
      <Pricing />
      <CTASection />
      <Footer />
    </main>
  );
}
