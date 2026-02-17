import React from 'react';
import { Camera, MapPin, BarChart3, DollarSign } from 'lucide-react';

const features = [
  {
    title: 'Photo Verification',
    description: 'Secure, accurate, and effortless time tracking with photo verification to eliminate buddy punching.',
    icon: <Camera className="w-6 h-6" />,
  },
  {
    title: 'Location Tracking',
    description: 'Precise GPS tracking ensures employees are exactly where they need to be when they clock in.',
    icon: <MapPin className="w-6 h-6" />,
  },
  {
    title: 'Reports & Analytics',
    description: 'Comprehensive insights into labor costs, attendance trends, and overtime alerts in real-time.',
    icon: <BarChart3 className="w-6 h-6" />,
  },
  {
    title: 'Payroll Integration',
    description: 'Seamlessly export hours to your favorite payroll provider. Save hours of manual data entry.',
    icon: <DollarSign className="w-6 h-6" />,
  },
];

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Features</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Everything you need to manage your workforce efficiently, from time tracking to payroll processing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group p-8 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-6 group-hover:bg-cico-green transition-colors duration-300">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-transparent group-hover:shadow-none transition-all">
                  <div className="text-cico-green group-hover:text-white transition-colors">
                    {feature.icon}
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
