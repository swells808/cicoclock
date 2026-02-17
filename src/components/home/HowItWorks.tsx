import React from 'react';
import { UserPlus, Clock, CheckCircle, FileText } from 'lucide-react';

const steps = [
  {
    id: '1',
    title: 'Sign Up & Configure',
    description: 'Create your account and set up employee profiles, locations, and schedules in minutes.',
    icon: <UserPlus className="w-6 h-6" />,
  },
  {
    id: '2',
    title: 'Employees Clock In',
    description: 'Staff clock in via the mobile app using photo verification and GPS location services.',
    icon: <Clock className="w-6 h-6" />,
  },
  {
    id: '3',
    title: 'Review & Approve',
    description: 'Managers review timesheets, approve overtime, and correct any missed punches easily.',
    icon: <CheckCircle className="w-6 h-6" />,
  },
  {
    id: '4',
    title: 'Process Payroll',
    description: 'Export verified data directly to your payroll system with a single click.',
    icon: <FileText className="w-6 h-6" />,
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-20 relative overflow-hidden bg-slate-50">
      {/* Background gradient splash */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50 to-green-100/40 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-emerald-50/80 to-transparent pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Get started in minutes. Our streamlined process makes implementation a breeze.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-xl hover:shadow-green-100/50 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-6">
                  <span className="text-6xl font-extrabold text-cico-green opacity-90 tracking-tighter leading-none">
                      {step.id}.
                  </span>
                  <div className="p-3 bg-green-50 rounded-xl group-hover:bg-cico-green transition-colors duration-300">
                    <div className="text-cico-green group-hover:text-white transition-colors">
                      {step.icon}
                    </div>
                  </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
