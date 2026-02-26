import React from "react";
import { Shield, Mail, Phone, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Shield className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-slate-900">SecureExam</span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              The world's most trusted AI-powered examination platform.
              Secure, private, and accessible for everyone.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>Home</li>
              <li>Features</li>
              <li>Pricing</li>
              <li>Documentation</li>
              <li>Help Center</li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>About Us</li>
              <li>Careers</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Security</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Contact Info</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                support@secureexam.ai
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600" />
                +1 (555) 000-0000
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                123 Security Blvd, Tech City, CA
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500">
          <p>(c) 2026 Secure Online Examination System. All rights reserved.</p>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
};

