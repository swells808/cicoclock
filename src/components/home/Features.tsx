import React from "react";
import { Camera, MapPin, BarChart3, DollarSign } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <div className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

export const Features: React.FC = () => {
  const features = [
    {
      icon: <Camera className="w-6 h-6 text-primary" />,
      title: "Photo Verification",
      description:
        "Secure, accurate, and effortless time tracking with photo verification and GPS. Boost productivity and eliminate time theft.",
    },
    {
      icon: <MapPin className="w-6 h-6 text-primary" />,
      title: "Location Tracking",
      description:
        "Location Tracking ensures employees clock in from designated work locations using GPS verification.",
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-primary" />,
      title: "Reports & Analytics",
      description:
        "Comprehensive reporting tools for workforce management, attendance trends, and real-time analytics dashboards.",
    },
    {
      icon: <DollarSign className="w-6 h-6 text-primary" />,
      title: "Payroll Integration",
      description:
        "Seamlessly integrate with your payroll system. Export timesheets, track overtime, and streamline your pay process.",
    },
  ];

  return (
    <section className="bg-muted/30 px-6 py-20 md:px-20">
      <div className="max-w-screen-xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
          Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
};
