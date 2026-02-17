import React from "react";
import { UserPlus, Clock, CheckCircle, Banknote } from "lucide-react";

interface StepCardProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const StepCard: React.FC<StepCardProps> = ({ number, icon, title, description }) => (
  <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center md:text-left">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-4xl font-bold text-primary/30">{number}.</span>
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: <UserPlus className="w-5 h-5 text-primary" />,
      title: "Sign Up & Configure",
      description: "Sign up and configure your company settings, departments, and employee profiles.",
    },
    {
      icon: <Clock className="w-5 h-5 text-primary" />,
      title: "Employees Clock In",
      description: "Employees clock in using PIN, photo verification, or the mobile-friendly timeclock.",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-primary" />,
      title: "Review & Approve",
      description: "Review and approve time entries, manage overtime, and handle time-off requests.",
    },
    {
      icon: <Banknote className="w-5 h-5 text-primary" />,
      title: "Process Payroll",
      description: "Process payroll with accurate timesheets, export reports, and integrate with your systems.",
    },
  ];

  return (
    <section className="bg-background px-6 py-20 md:px-20">
      <div className="max-w-screen-xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <StepCard key={step.title} number={i + 1} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
};
