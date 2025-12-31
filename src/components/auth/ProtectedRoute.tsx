import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isForeman, isLoading: rolesLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Foremen can access /timeclock and /time-tracking/admin (read-only)
  const foremanAllowedPaths = ["/timeclock", "/time-tracking/admin"];
  if (isForeman && !foremanAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/timeclock" replace />;
  }

  return <>{children}</>;
};
