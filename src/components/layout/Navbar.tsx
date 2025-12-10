import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Menu, X, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { Logo } from "@/components/ui/Logo";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: profile } = useProfile();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || "U";
  };

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/features", label: "Features" },
    { to: "/pricing", label: "Pricing" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-screen-xl mx-auto px-4 md:px-20">
        <div className="flex h-[65px] items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {!user ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-gray-600 hover:text-primary transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex items-center gap-4 ml-4">
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-primary transition-colors font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/company-signup"
                    className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-primary transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/timeclock"
                  className="text-gray-600 hover:text-primary transition-colors font-medium"
                >
                  Timeclock
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-gray-200">
            {!user ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block py-3 text-gray-600 hover:text-primary font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex gap-3 pt-4">
                  <Link
                    to="/login"
                    className="flex-1 text-center py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/company-signup"
                    className="flex-1 text-center py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="block py-3 text-gray-600 hover:text-primary font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/timeclock"
                  className="block py-3 text-gray-600 hover:text-primary font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Timeclock
                </Link>
                <Link
                  to="/settings"
                  className="block py-3 text-gray-600 hover:text-primary font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  className="w-full mt-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 flex items-center justify-center gap-2"
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
