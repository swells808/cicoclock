import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfile } from "@/hooks/useProfile";
import { Logo } from "@/components/ui/Logo";
import { UserAvatarDropdown } from "@/components/ui/UserAvatarDropdown";
import {
  Clock,
  LayoutDashboard,
  Users,
  FolderKanban,
  Building2,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  IdCard,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const AuthenticatedHeader = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, isSupervisor } = useUserRole();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Desktop nav items (simplified)
  const desktopNavItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Clock", path: "/timeclock" },
    ...(isAdmin || isSupervisor
      ? [
          { label: "Admin Time", path: "/admin-time-tracking" },
          { label: "Projects", path: "/projects" },
          { label: "Clients", path: "/clients" },
          { label: "Reports", path: "/reports" },
          { label: "Users", path: "/users" },
          { label: "QR Codes", path: "/task-qr-codes" },
        ]
      : []),
  ];

  // Mobile nav items (full navigation with icons)
  const mobileNavItems = [
    { icon: LayoutDashboard, label: t("dashboard") || "Dashboard", path: "/dashboard" },
    { icon: Clock, label: "Clock", path: "/timeclock" },
    { icon: ClipboardCheck, label: t("taskCheckin") || "Task Check-in", path: "/task-checkin" },
    ...(isAdmin || isSupervisor
      ? [
          { icon: Clock, label: "Admin Time", path: "/admin-time-tracking" },
          { icon: Users, label: t("users") || "Users", path: "/users" },
          { icon: FolderKanban, label: t("projects") || "Projects", path: "/projects" },
          { icon: Building2, label: t("clients") || "Clients", path: "/clients" },
          { icon: FileText, label: t("reports") || "Reports", path: "/reports" },
          { icon: IdCard, label: t("badgeDesigner") || "Badge Designer", path: "/badge-designer" },
          { icon: FileText, label: "QR Codes", path: "/task-qr-codes" },
        ]
      : []),
    { icon: Settings, label: t("settings") || "Settings", path: "/settings" },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 border-b bg-background z-50">
        <div className="container mx-auto h-full px-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard">
            <Logo />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {desktopNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-secondary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop User Menu */}
          <div className="hidden lg:flex items-center gap-4">
            <UserAvatarDropdown
              user={{
                email: user?.email || "",
                raw_user_meta_data: {
                  display_name: profile?.display_name || profile?.first_name || undefined,
                  avatar_url: profile?.avatar_url || undefined,
                },
              }}
            />
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-background z-40 p-4 overflow-y-auto">
          <nav className="space-y-1">
            {mobileNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 pt-4 border-t">
            <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("signOut")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
