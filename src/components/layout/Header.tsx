import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatarDropdown } from "@/components/ui/UserAvatarDropdown";

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const navLinks = [
    { href: "/", text: "Home" },
    { href: "/features", text: "Features" },
    { href: "/pricing", text: "Pricing" },
    { href: "/about", text: "About" },
    { href: "/contact", text: "Contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2 no-underline">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cico-green to-emerald-300 flex items-center justify-center text-white font-bold">
              <Clock size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">
              CICO <span className="text-cico-green font-medium">Timeclock</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.text}
                to={link.href}
                className={`text-sm font-medium no-underline transition-colors ${
                  location.pathname === link.href
                    ? "text-cico-green"
                    : "text-muted-foreground hover:text-cico-green"
                }`}
              >
                {link.text}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="text-sm font-semibold text-cico-blue hover:brightness-110 transition-colors px-4 py-2 rounded-lg no-underline"
                >
                  Dashboard
                </Link>
                <UserAvatarDropdown user={user} size="sm" />
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-cico-blue hover:brightness-110 transition-colors px-4 py-2 rounded-lg no-underline"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-semibold bg-cico-green text-white hover:brightness-110 transition-all shadow-lg shadow-green-200 px-6 py-2.5 rounded-full no-underline"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-muted-foreground hover:text-foreground focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-background shadow-xl border-t border-border">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.text}
                to={link.href}
                className={`block px-3 py-3 rounded-md text-base font-medium no-underline ${
                  location.pathname === link.href
                    ? "text-cico-green bg-green-50"
                    : "text-foreground hover:text-cico-green hover:bg-muted"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.text}
              </Link>
            ))}
            <div className="mt-4 flex flex-col space-y-3">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="w-full text-center text-sm font-semibold text-cico-blue hover:bg-blue-50 py-3 rounded-lg border border-blue-100 no-underline"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <div className="px-3 py-2">
                    <UserAvatarDropdown user={user} size="sm" />
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full text-center text-sm font-semibold text-cico-blue hover:bg-blue-50 py-3 rounded-lg border border-blue-100 no-underline"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="w-full text-center text-sm font-semibold bg-cico-green text-white hover:brightness-110 py-3 rounded-lg shadow-md no-underline"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Start Free Trial
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
