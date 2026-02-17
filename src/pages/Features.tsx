import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CustomButton } from "@/components/ui/custom-button";
import { ScanFace, ListTodo, Wallet, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import FeatureCard from "@/components/features/FeatureCard";

const Features = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-24 lg:pb-28 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
              {/* Text Content */}
              <div className="lg:col-span-6 text-center lg:text-left mb-12 lg:mb-0">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.15]">
                  Unlocking Efficiency with{" "}
                  <span className="text-cico-green block mt-2">
                    Advanced Time Tracking Features
                  </span>
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Explore the tools that make CICO Timeclock the smartest choice for managing your workforce. Seamlessly integrate attendance, projects, and payroll.
                </p>
                <div className="mt-8 sm:mt-10 flex justify-center lg:justify-start">
                  <Link to="/company-signup">
                    <CustomButton variant="primary" className="px-8 py-4 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                      Start Free Trial
                    </CustomButton>
                  </Link>
                </div>
              </div>

              {/* Image Content */}
              <div className="lg:col-span-6 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-cico-green/5 to-cico-blue/5 rounded-full blur-3xl -z-10 opacity-60" />
                <div className="relative flex justify-center lg:justify-end items-center">
                  <img
                    src="https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=800&auto=format&fit=crop"
                    alt="Mobile App Interface"
                    className="relative z-10 w-full max-w-md lg:max-w-lg rounded-[2.5rem] shadow-2xl border-8 border-card ring-1 ring-border transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500"
                  />
                  <div className="absolute -bottom-10 -left-10 z-20 hidden sm:block">
                    <div className="bg-card p-4 rounded-2xl shadow-xl border border-border animate-bounce-slow">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-cico-green/10 rounded-full flex items-center justify-center text-cico-green">
                          <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Clocked In</p>
                          <p className="text-xs text-muted-foreground">08:59 AM - On Time</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <FeatureCard
              headline="Smart Clock-In with Facial Recognition"
              description="Clock in with a smile. Eliminate buddy punching and ensure accurate attendance with secure, touchless facial recognition technology. Get precise records, every time, reducing payroll errors significantly."
              imageSrc="https://images.unsplash.com/photo-1661956602116-aa6865609028?auto=format&fit=crop&q=80&w=800"
              icon={ScanFace}
              imageOnRight={false}
            />

            <FeatureCard
              headline="Project & Task Management"
              description="Track every minute, on every project. Assign time to specific tasks and monitor progress in real-time for precise billing and resource allocation. Keep your team aligned and productivity high."
              imageSrc="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
              icon={ListTodo}
              imageOnRight={true}
            />

            <FeatureCard
              headline="Seamless Payroll Integrations"
              description="Connect with your favorite accounting software like QuickBooks and Xero for automated, error-free payroll processing. Save hours every pay period by eliminating manual data entry."
              imageSrc="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800"
              icon={Wallet}
              imageOnRight={false}
              extraContent={
                <div className="flex flex-wrap gap-4 mt-2 items-center justify-center lg:justify-start opacity-70">
                  <span className="font-bold text-muted-foreground text-xl flex items-center gap-1">
                    <div className="w-6 h-6 bg-cico-green rounded-full" /> QuickBooks
                  </span>
                  <span className="font-bold text-cico-blue text-xl flex items-center gap-1">
                    <div className="w-6 h-6 bg-cico-blue rounded-full" /> Xero
                  </span>
                </div>
              }
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-r from-cico-green/5 to-cico-green/10 rounded-[2.5rem] p-10 sm:p-16 text-center shadow-soft border border-cico-green/10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Ready to start tracking smarter?
                <br className="hidden sm:block" />
                Get started with CICO Timeclock today.
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                Join thousands of businesses streamlining their workforce management. No credit card required for the trial.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/company-signup">
                  <CustomButton variant="primary" className="px-8 py-4 text-lg font-bold rounded-xl shadow-lg">
                    Start Free Trial
                  </CustomButton>
                </Link>
                <Link to="/contact">
                  <CustomButton variant="secondary" className="px-8 py-4 text-lg font-bold rounded-xl shadow-lg bg-cico-blue text-white hover:bg-cico-blue/90">
                    Schedule a Demo
                  </CustomButton>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Features;
