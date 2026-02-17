import React from 'react';
import { Facebook, Twitter, Linkedin, Youtube, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white pt-16 pb-8 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cico-green to-emerald-300 flex items-center justify-center text-white">
                    <Clock size={14} />
                </div>
                <span className="font-bold text-lg text-slate-800">CICO <span className="text-cico-green">Timeclock</span></span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Simplifying workforce management for modern businesses. Accurate, secure, and easy to use.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link to="/" className="hover:text-cico-green transition-colors">Home</Link></li>
              <li><Link to="/features" className="hover:text-cico-green transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-cico-green transition-colors">Pricing</Link></li>
              <li><Link to="/about" className="hover:text-cico-green transition-colors">About Us</Link></li>
            </ul>
          </div>

           {/* Company Info */}
           <div>
            <h4 className="font-bold text-slate-900 mb-4">Company Info</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link to="/contact" className="hover:text-cico-green transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-cico-green transition-colors">Privacy Policy</Link></li>
              <li><a href="#" className="hover:text-cico-green transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-cico-green transition-colors">Support</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
             <h4 className="font-bold text-slate-900 mb-4">Connect With Us</h4>
             <div className="flex space-x-3">
                <a href="#" className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-cico-green hover:bg-cico-green hover:text-white transition-all">
                    <Facebook size={16} />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-cico-green hover:bg-cico-green hover:text-white transition-all">
                    <Twitter size={16} />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-cico-green hover:bg-cico-green hover:text-white transition-all">
                    <Linkedin size={16} />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-cico-green hover:bg-cico-green hover:text-white transition-all">
                    <Youtube size={16} />
                </a>
             </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
                &copy; {new Date().getFullYear()} CICO Timeclock. All rights reserved.
            </p>
        </div>
      </div>
    </footer>
  );
};
