import React from "react";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppMockup } from "./AppMockup";

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden bg-background">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-full lg:w-3/5 h-full bg-dot-pattern opacity-60"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-t from-muted via-background to-transparent opacity-80"></div>
        <div className="absolute top-20 right-20 w-72 h-72 bg-green-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-8">
            <h1 className="text-4xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-tight">
              Simplify Your Workforce. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">
                Time Tracking, Reinvented.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Secure, accurate, and effortless time tracking with photo verification and GPS.
              Boost productivity and eliminate time theft with our intelligent platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={() => navigate("/signup")}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-cico-green text-white font-semibold text-lg hover:brightness-110 transition-all shadow-lg shadow-green-200 hover:shadow-green-300 transform hover:-translate-y-0.5"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => navigate("/features")}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-cico-blue text-white font-semibold text-lg hover:brightness-110 transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
              >
                <Play size={20} fill="currentColor" /> Watch Demo
              </button>
            </div>

            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cico-green"></div> No Credit Card Required
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cico-green"></div> 14-Day Free Trial
              </div>
            </div>
          </div>

          {/* Right Visual - 3D Mockup */}
          <div className="relative flex items-center justify-center lg:justify-end mt-12 lg:mt-0">
            <div className="relative w-[300px] h-[600px] sm:w-[320px] sm:h-[640px]">
              {/* Back Phone */}
              <div className="absolute top-12 left-12 w-full h-full transform rotate-6 scale-95 opacity-60 origin-bottom-right transition-all hover:translate-x-4 hover:rotate-12 duration-500 z-10">
                <AppMockup variant="secondary" />
              </div>
              {/* Front Phone */}
              <div className="absolute top-0 left-0 w-full h-full transform transition-all hover:-translate-y-2 duration-500 shadow-2xl rounded-[3rem] z-20">
                <AppMockup variant="primary" />
              </div>

              {/* Floating Elements/Badges */}
              <div className="absolute -right-8 top-1/4 bg-background p-4 rounded-2xl shadow-xl z-30 animate-bounce-slow hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">$</div>
                  <div>
                    <div className="text-xs text-muted-foreground">Savings</div>
                    <div className="text-lg font-bold text-foreground">$4,250</div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-8 bottom-1/3 bg-background p-4 rounded-2xl shadow-xl z-30 animate-pulse-slow hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-cico-blue">📍</div>
                  <div>
                    <div className="text-xs text-muted-foreground">Location</div>
                    <div className="text-sm font-bold text-foreground">Verified</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
