import { Toaster } from "@/components/ui/toaster";
import PublicBadge from "./pages/PublicBadge";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PlatformRoute } from "@/components/routing/PlatformRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
import MobileLogin from "./pages/mobile/MobileLogin";
import CompanySignup from "./pages/CompanySignup";
import Dashboard from "./pages/Dashboard";
import MobileDashboard from "./pages/mobile/MobileDashboard";
import MobileProfile from "./pages/mobile/MobileProfile";
import Timeclock from "./pages/Timeclock";
import MobileTimeclock from "./pages/mobile/MobileTimeclock";
import TaskCheckin from "./pages/TaskCheckin";
import MobileTaskCheckin from "./pages/mobile/MobileTaskCheckin";
import Users from "./pages/Users";
import Projects from "./pages/Projects";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import BadgeDesigner from "./pages/BadgeDesigner";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import AdminTimeTracking from "./pages/AdminTimeTracking";
import TaskQrCodes from "./pages/TaskQrCodes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <CompanyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={
                  <PlatformRoute web={<Index />} mobile={<Navigate to="/login" replace />} />
                } />
                <Route path="/signup" element={<CompanySignup />} />
                <Route path="/login" element={<PlatformRoute web={<Login />} mobile={<MobileLogin />} />} />
                <Route path="/company-signup" element={<CompanySignup />} />
                <Route path="/features" element={<Features />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/badge/:profileId" element={<PublicBadge />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <PlatformRoute web={<Dashboard />} mobile={<MobileDashboard />} />
                  </ProtectedRoute>
                } />
                <Route path="/timeclock" element={
                  <ProtectedRoute>
                    <PlatformRoute web={<Timeclock />} mobile={<MobileTimeclock />} />
                  </ProtectedRoute>
                } />
                <Route path="/task-checkin" element={
                  <ProtectedRoute>
                    <PlatformRoute web={<TaskCheckin />} mobile={<MobileTaskCheckin />} />
                  </ProtectedRoute>
                } />
                <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <PlatformRoute web={<Settings />} mobile={<MobileProfile />} />
                  </ProtectedRoute>
                } />
                <Route path="/badge-designer" element={<ProtectedRoute><BadgeDesigner /></ProtectedRoute>} />
                <Route path="/time-tracking/admin" element={<ProtectedRoute><AdminTimeTracking /></ProtectedRoute>} />
                <Route path="/task-qr-codes" element={<ProtectedRoute><TaskQrCodes /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CompanyProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
