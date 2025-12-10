import { PublicLayout } from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock, Users, Target, Award, Shield, Heart } from "lucide-react";

const About = () => {
  const { t } = useLanguage();

  const values = [
    {
      icon: Clock,
      title: "Simplicity",
      description: "We believe time tracking should be effortless. Our tools are designed to be intuitive and easy to use.",
    },
    {
      icon: Users,
      title: "Teamwork",
      description: "We build tools that bring teams together, making collaboration and management seamless.",
    },
    {
      icon: Target,
      title: "Accuracy",
      description: "Precision matters. Our systems ensure every minute is tracked accurately for fair payroll.",
    },
    {
      icon: Award,
      title: "Excellence",
      description: "We're committed to delivering the best time tracking experience in the industry.",
    },
    {
      icon: Shield,
      title: "Security",
      description: "Your data is protected with enterprise-grade security and encryption.",
    },
    {
      icon: Heart,
      title: "Customer Focus",
      description: "Our customers are at the heart of everything we do. Your success is our success.",
    },
  ];

  const stats = [
    { value: "10K+", label: "Businesses" },
    { value: "500K+", label: "Employees Tracked" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
  ];

  return (
    <PublicLayout>
      <div className="bg-white py-24 mt-[65px]">
        <div className="max-w-screen-xl mx-auto px-4 md:px-20">
          {/* Hero */}
          <div className="text-center mb-20">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              About CICO Timeclock
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're on a mission to make time tracking simple, secure, and reliable for businesses of all sizes.
            </p>
          </div>

          {/* Mission */}
          <div className="bg-gray-50 rounded-2xl p-12 mb-20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                We believe that tracking employee time shouldn't be complicated. CICO Timeclock was built 
                to provide businesses with a modern, reliable, and secure solution for managing workforce 
                attendance. Our platform combines photo verification, GPS tracking, and intuitive reporting 
                to help you focus on what matters most—running your business.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Values */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Our Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {values.map((value, index) => (
                <div key={index} className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                    <value.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-primary rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses using CICO Timeclock to streamline their workforce management.
            </p>
            <a
              href="/company-signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default About;
