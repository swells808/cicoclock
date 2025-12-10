import React from "react";
import { Logo } from "@/components/ui/Logo";
import { Link } from "react-router-dom";
import { Twitter, Linkedin, Facebook, Instagram } from "lucide-react";

export const Footer: React.FC = () => {
  const quickLinks = [
    { to: "/", label: "Home" },
    { to: "/features", label: "Features" },
    { to: "/pricing", label: "Pricing" },
  ];

  const companyLinks = [
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
    { to: "/privacy", label: "Privacy Policy" },
  ];

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
  ];

  return (
    <footer className="bg-gray-50 px-4 md:px-20 py-12">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
          {/* Logo and Tagline */}
          <div className="max-w-[300px]">
            <Logo className="mb-4" />
            <p className="text-sm text-gray-600 leading-relaxed">
              Simple and secure time tracking for modern businesses. Photo verification, GPS tracking, and detailed reports.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-16">
            {/* Quick Links */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Links</h3>
              <div className="flex flex-col gap-3">
                {quickLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-sm text-gray-600 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">Company</h3>
              <div className="flex flex-col gap-3">
                {companyLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-sm text-gray-600 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Connect */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">Connect</h3>
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-sm text-gray-600 pt-8 border-t border-gray-200">
          © {new Date().getFullYear()} CICO Timeclock. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
