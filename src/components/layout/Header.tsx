import React, { useState } from 'react';
import { Menu, X, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatarDropdown } from '@/components/ui/UserAvatarDropdown';

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer no-underline">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cico-green to-emerald-300 flex items-center justify-center text-white font-bold">
                <Clock size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">CICO <span className="text-cico-green font-medium">Timeclock</span></span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm font-medium text-slate-600 hover:text-cico-green transition-colors no-underline"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="text-sm font-semibold text-cico-blue hover:text-blue-700 transition-colors px-4 py-2 rounded-lg"
                >
                  Dashboard
                </button>
                <UserAvatarDropdown user={user} size="sm" />
              </div>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/login')}
                  className="text-sm font-semibold text-cico-blue hover:text-blue-700 transition-colors px-4 py-2 rounded-lg"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigate('/signup')}
                  className="text-sm font-semibold bg-cico-green text-white hover:bg-emerald-500 transition-all shadow-lg shadow-green-200 px-6 py-2.5 rounded-full"
                >
                  Start Free Trial
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white shadow-xl border-t border-slate-100 z-50">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="block px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-cico-green hover:bg-slate-50 no-underline"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="mt-4 flex flex-col space-y-3">
              {user ? (
                <button 
                  onClick={() => { navigate('/dashboard'); setIsOpen(false); }}
                  className="w-full text-center text-sm font-semibold text-cico-blue hover:bg-blue-50 py-3 rounded-lg border border-blue-100"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => { navigate('/login'); setIsOpen(false); }}
                    className="w-full text-center text-sm font-semibold text-cico-blue hover:bg-blue-50 py-3 rounded-lg border border-blue-100"
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => { navigate('/signup'); setIsOpen(false); }}
                    className="w-full text-center text-sm font-semibold bg-cico-green text-white hover:bg-emerald-500 py-3 rounded-lg shadow-md"
                  >
                    Start Free Trial
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
