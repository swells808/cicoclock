import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroMockup from "@/assets/hero-mockup.png";

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="mt-[65px] bg-background px-6 py-20 md:px-20 md:py-28">
      <div className="max-w-screen-xl mx-auto flex flex-col-reverse md:flex-row items-center justify-between gap-12">
        {/* Left content */}
        <div className="max-w-[540px] text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-foreground mb-2">
            Simplify Your Workforce.
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight text-muted-foreground mb-6">
            Time Tracking, Reinvented.
          </h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Secure, accurate, and effortless time tracking with photo
            verification and GPS. Boost productivity and eliminate time theft.
          </p>
          <div className="flex gap-4 justify-center md:justify-start">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-6 text-base font-semibold"
              onClick={() => navigate("/signup")}
            >
              Start Free Trial
            </Button>
            <Button
              size="lg"
              variant="default"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-8 py-6 text-base font-semibold"
              onClick={() => navigate("/features")}
            >
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Right mockup image */}
        <div className="w-full max-w-[500px] flex-shrink-0">
          <img
            src={heroMockup}
            alt="CICO Timeclock mobile app interface showing employee time tracking dashboard"
            className="w-full h-auto"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
};
