import { ReactNode } from "react";
import { AuthenticatedHeader } from "./AuthenticatedHeader";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedHeader />
      <main className="pt-20 pb-8">
        <div className="container mx-auto px-4 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};
