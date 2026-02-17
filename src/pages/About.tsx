import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CustomButton } from "@/components/ui/custom-button";
import { CheckCircle, BarChart3, Puzzle, Monitor } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: <CheckCircle className="h-8 w-8" />,
    title: "Secure Clock-Ins",
    description: "Photo verification and geolocation tracking for accurate attendance.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    title: "Smart Reporting",
    description: "Comprehensive insights for better workforce management.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: <Puzzle className="h-8 w-8" />,
    title: "Easy Integration",
    description: "Seamless connection with your existing tools.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: <Monitor className="h-8 w-8" />,
    title: "Multi-Platform",
    description: "Works on any device, anywhere, anytime.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
];

const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-cico-dark/70" />
          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Empowering Businesses with Simple &amp; Efficient Time Tracking
            </h1>
            <p className="text-white/80 text-lg">
              CICO Timeclock was built to help small and medium-sized businesses track work hours with ease and accuracy.
            </p>
          </div>
        </section>

        {/* Story + Features Grid */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Our Story Card */}
              <div className="md:row-span-2 bg-card rounded-2xl border border-border shadow-soft p-8 flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-foreground mb-4">Our Story</h2>
                <p className="text-muted-foreground mb-4">
                  Founded in 2018, CICO Timeclock emerged from a simple observation: small businesses needed a better way to track employee time.
                </p>
                <p className="text-muted-foreground mb-4">
                  Our founders experienced firsthand the challenges of manual time tracking and decided to create a solution that would make it effortless.
                </p>
                <p className="text-muted-foreground">
                  Our mission is to simplify workforce management while ensuring accuracy and compliance. We value transparency, reliability, and user-centered design in everything we do.
                </p>
              </div>

              {/* Feature Cards */}
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-card rounded-2xl border border-border shadow-soft p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                    <div className={feature.color}>{feature.icon}</div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="pb-16 md:pb-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto bg-card rounded-2xl border border-border shadow-soft p-10 md:p-14 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                Join Thousands of Businesses Tracking Time the Smart Way!
              </h2>
              <Link to="/company-signup">
                <CustomButton variant="primary" className="w-full md:w-auto md:px-16 py-3 text-lg rounded-xl">
                  Start Free Trial
                </CustomButton>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
