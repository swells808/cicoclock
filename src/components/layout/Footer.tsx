import React from "react";
import { Logo } from "@/components/ui/Logo";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-muted/30 border-t border-border px-6 py-12 md:px-20">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-10 mb-8">
          {/* Logo */}
          <div className="max-w-[250px]">
            <Logo className="mb-4" />
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-base font-semibold text-foreground mb-4">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-sm text-muted-foreground no-underline hover:text-primary">Home</Link>
              <Link to="/features" className="text-sm text-muted-foreground no-underline hover:text-primary">Features</Link>
              <Link to="/contact" className="text-sm text-muted-foreground no-underline hover:text-primary">Contact</Link>
            </div>
          </div>

          {/* Company Info */}
          <div className="max-w-[250px]">
            <h3 className="text-base font-semibold text-foreground mb-4">Company Info</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              CICO Timeclock is a comprehensive workforce management platform for time tracking, attendance, and payroll integration.
            </p>
          </div>

          {/* Social */}
          <div className="flex gap-3 items-start">
            <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
              <Facebook className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
              <Instagram className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
              <Linkedin className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="#" aria-label="YouTube" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
              <Youtube className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </div>

        <div className="text-sm text-muted-foreground pt-6 border-t border-border">
          © 2025 CICO Timeclock. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
