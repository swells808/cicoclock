import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock, Menu, X, LogOut, User, Settings, LayoutDashboard } from "lucide-react";
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

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">CICO</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {!user ? (
              <>
                <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("features")}
                </Link>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("pricing")}
                </Link>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("about")}
                </Link>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("contact")}
                </Link>
                <Button variant="ghost" asChild>
                  <Link to="/login">{t("login")}</Link>
                </Button>
                <Button asChild>
                  <Link to="/company-signup">{t("getStarted")}</Link>
                </Button>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("dashboard")}
                </Link>
                <Link to="/timeclock" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("timeclock")}
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback>{getInitials()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {t("dashboard")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      {t("settings")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("signOut")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {!user ? (
              <>
                <Link
                  to="/features"
                  className="block py-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("features")}
                </Link>
                <Link
                  to="/pricing"
                  className="block py-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("pricing")}
                </Link>
                <Link
                  to="/about"
                  className="block py-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("about")}
                </Link>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" asChild className="flex-1">
                    <Link to="/login">{t("login")}</Link>
                  </Button>
                  <Button asChild className="flex-1">
                    <Link to="/company-signup">{t("getStarted")}</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="block py-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("dashboard")}
                </Link>
                <Link
                  to="/timeclock"
                  className="block py-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("timeclock")}
                </Link>
                <Link
                  to="/settings"
                  className="block py-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("settings")}
                </Link>
                <Button variant="outline" className="w-full mt-4" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("signOut")}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
