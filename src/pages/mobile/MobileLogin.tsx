import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Fingerprint, ScanFace, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBiometrics } from "@/hooks/useBiometrics";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";

const MobileLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { company } = useCompany();
  const {
    isAvailable: biometricAvailable,
    biometryType,
    isLoading: biometricCheckLoading,
    authenticate,
    saveCredentials,
    getCredentials,
    hasStoredCredentials,
  } = useBiometrics();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/timeclock");
    }
  }, [user, navigate]);

  // Auto-trigger biometric auth if available and has stored credentials
  useEffect(() => {
    if (!biometricCheckLoading && biometricAvailable && hasStoredCredentials && !user) {
      handleBiometricLogin();
    }
  }, [biometricCheckLoading, biometricAvailable, hasStoredCredentials, user]);

  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    try {
      const authenticated = await authenticate();
      if (!authenticated) {
        toast({
          title: "Authentication Failed",
          description: "Biometric authentication was not successful",
          variant: "destructive",
        });
        return;
      }

      const credentials = await getCredentials();
      if (!credentials) {
        toast({
          title: "No Saved Credentials",
          description: "Please login with email and password first",
          variant: "destructive",
        });
        return;
      }

      const { error } = await signIn(credentials.username, credentials.password);
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message || "Stored credentials may be invalid",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome Back!",
        description: "Successfully logged in with biometrics",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Biometric login failed",
        variant: "destructive",
      });
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;

      // Save credentials for biometric login if enabled
      if (rememberMe && biometricAvailable) {
        await saveCredentials({ username: email, password });
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const BiometricIcon = biometryType === 'face' ? ScanFace : Fingerprint;
  const biometricLabel = biometryType === 'face' ? 'Face ID' : 'Fingerprint';

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-6 py-8">
        <div className="flex items-center gap-4">
          {company?.company_logo_url && (
            <img 
              src={company.company_logo_url} 
              alt={company.company_name}
              className="h-12 w-12 rounded-full object-cover bg-white/10"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {company?.company_name || 'CICO'}
            </h1>
            <p className="text-sm opacity-80">Employee Time Clock</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 flex flex-col">
        <div className="space-y-6 flex-1">
          {/* Biometric Login Button */}
          {biometricAvailable && hasStoredCredentials && (
            <Card className="p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <BiometricIcon className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Quick Login</h2>
                  <p className="text-sm text-muted-foreground">
                    Use {biometricLabel} to login instantly
                  </p>
                </div>
                <Button
                  onClick={handleBiometricLogin}
                  disabled={isBiometricLoading}
                  className="w-full h-14 text-lg"
                  size="lg"
                >
                  {isBiometricLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <BiometricIcon className="h-6 w-6" />
                      Login with {biometricLabel}
                    </span>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Divider */}
          {biometricAvailable && hasStoredCredentials && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-muted-foreground">
                  or login with email
                </span>
              </div>
            </div>
          )}

          {/* Email Login Form */}
          <Card className="p-6">
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">
                  {biometricAvailable && hasStoredCredentials 
                    ? "Email Login" 
                    : "Login to Your Account"}
                </h2>
                {!hasStoredCredentials && biometricAvailable && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Login once to enable {biometricLabel}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-11 h-12 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-11 pr-11 h-12 text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {biometricAvailable && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Enable {biometricLabel} for future logins
                  </label>
                </div>
              )}

              <Button
                type="submit"
                className={cn(
                  "w-full h-14 text-lg",
                  "bg-primary hover:bg-primary/90"
                )}
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Logging in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    Login
                  </span>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Need help? Contact your administrator</p>
        </div>
      </main>
    </div>
  );
};

export default MobileLogin;
