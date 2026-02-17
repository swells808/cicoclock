import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Linkedin, Youtube, Clock } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-background pt-16 pb-8 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cico-green to-emerald-300 flex items-center justify-center text-white">
                <Clock size={14} />
              </div>
              <span className="font-bold text-lg text-foreground">
                CICO <span className="text-cico-green">Timeclock</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Simplifying workforce management for modern businesses. Accurate, secure, and easy to use.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-cico-green transition-colors no-underline text-muted-foreground">Home</Link></li>
              <li><Link to="/features" className="hover:text-cico-green transition-colors no-underline text-muted-foreground">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-cico-green transition-colors no-underline text-muted-foreground">Pricing</Link></li>
              <li><Link to="/about" className="hover:text-cico-green transition-colors no-underline text-muted-foreground">About Us</Link></li>
            </ul>
          </div>

          {/* Company Info */}
          <div>
            <h4 className="font-bold text-foreground mb-4">Company Info</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-cico-green transition-colors no-underline text-muted-foreground">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-cico-green transition-colors no-underline text-muted-foreground">Privacy Policy</Link></li>
              <li><a href="#" className="hover:text-cico-green transition-colors no-underline text-muted-foreground">Terms of Service</a></li>
              <li><a href="#" className="hover:text-cico-green transition-colors no-underline text-muted-foreground">Support</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-bold text-foreground mb-4">Connect With Us</h4>
            <div className="flex space-x-3">
              <a href="#" className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-cico-green hover:bg-cico-green hover:text-white transition-all" aria-label="Facebook">
                <Facebook size={16} />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-cico-green hover:bg-cico-green hover:text-white transition-all" aria-label="Twitter">
                <Twitter size={16} />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-cico-green hover:bg-cico-green hover:text-white transition-all" aria-label="LinkedIn">
                <Linkedin size={16} />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-cico-green hover:bg-cico-green hover:text-white transition-all" aria-label="YouTube">
                <Youtube size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CICO Timeclock. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
