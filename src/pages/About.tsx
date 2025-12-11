import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CustomButton } from "@/components/ui/custom-button";
import { Shield, BarChart3, Puzzle, Smartphone } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="pt-16">
        <section className="relative h-[600px] flex items-center">
          <div className="absolute inset-0">
            <img
              className="w-full h-full object-cover"
              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/71f33e02d5-3b4ee9b4f6ff3271ca82.png"
              alt="modern office space with people working, bright and airy, minimalist style"
            />
            <div className="absolute inset-0 bg-white/80"></div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Empowering Businesses with Simple & Efficient Time Tracking
              </h1>
              <p className="text-xl text-gray-600">
                CICO Timeclock was built to help small and medium-sized businesses track work hours with ease and accuracy.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
                <p className="text-gray-600 mb-6">
                  Founded in 2018, CICO Timeclock emerged from a simple observation: small businesses needed a better way to track employee time. Our founders experienced firsthand the challenges of manual time tracking and decided to create a solution that would make it effortless.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <svg className="w-5 h-5 text-[#4BA0F4] mt-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-600">
                      Our mission is to simplify workforce management while ensuring accuracy and compliance.
                    </p>
                  </div>
                  <div className="flex items-start space-x-4">
                    <svg className="w-5 h-5 text-[#4BA0F4] mt-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-600">
                      We value transparency, reliability, and user-centered design in everything we do.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <Shield className="w-12 h-12 text-[#008000] mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Secure Clock-Ins</h3>
                  <p className="text-gray-600">Photo verification and geolocation tracking for accurate attendance.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <BarChart3 className="w-12 h-12 text-[#008000] mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Smart Reporting</h3>
                  <p className="text-gray-600">Comprehensive insights for better workforce management.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <Puzzle className="w-12 h-12 text-[#008000] mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Easy Integration</h3>
                  <p className="text-gray-600">Seamless connection with your existing tools.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <Smartphone className="w-12 h-12 text-[#008000] mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Multi-Platform</h3>
                  <p className="text-gray-600">Works on any device, anywhere, anytime.</p>
                </div>
              </div>
            </div>

            <div className="mt-20 text-center">
              <h2 className="text-3xl font-bold mb-8">
                Join Thousands of Businesses Tracking Time the Smart Way!
              </h2>
              <CustomButton variant="primary">Start Free Trial</CustomButton>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
