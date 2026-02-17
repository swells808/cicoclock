import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { Menu, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <header className="fixed h-[65px] border-b-gray-100 z-[1000] bg-[rgba(255,255,255,0.95)] border-b border-solid top-0 inset-x-0">
      <div className="max-w-screen-xl h-full flex items-center justify-between mx-auto my-0 px-20 py-0 max-md:px-10 max-md:py-0 max-sm:p-4">
        <Logo />

        <nav className="flex gap-[30px] max-sm:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.text}
              to={link.href}
              className={`text-base no-underline ${
                location.pathname === link.href ? "text-[#008000]" : "text-gray-700 hover:text-[#4BA0F4]"
              }`}
            >
              {link.text}
            </Link>
          ))}
        </nav>

        <div className="flex gap-3 max-sm:hidden">
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button
                  variant="outline"
                  className="border-[#5296ED] text-[#5296ED] hover:bg-[#5296ED]/10"
                >
                  Dashboard
                </Button>
              </Link>
              <UserAvatarDropdown user={user} size="sm" />
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6"
                >
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6"
                >
                  Start Free Trial
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="hidden max-sm:block text-gray-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {isMobileMenuOpen && (
          <div className="hidden max-sm:block fixed inset-0 top-[65px] bg-white z-50">
            <div className="flex flex-col p-4">
              {navLinks.map((link) => (
                <Link
                  key={link.text}
                  to={link.href}
                  className={`text-base no-underline py-3 border-b border-gray-100 ${
                    location.pathname === link.href ? "text-[#008000]" : "text-gray-700"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.text}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 text-[#008000] text-sm cursor-pointer px-3 py-2 mt-4 border border-[#008000] rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <div className="px-3 py-2 mt-2">
                    <UserAvatarDropdown user={user} size="sm" />
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 text-[#008000] text-sm cursor-pointer px-3 py-2 mt-4 border border-[#008000] rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="flex items-center justify-center gap-2 text-white text-sm cursor-pointer bg-[#008000] px-3 py-2 rounded-lg mt-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
