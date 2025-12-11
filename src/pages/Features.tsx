import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CustomButton } from "@/components/ui/custom-button";
import { Clock, FolderTree, Camera } from "lucide-react";

const Features = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main>
        <section className="pt-24 h-[600px] bg-gradient-to-br from-white via-blue-50 to-green-50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                  Everything You Need for Seamless Time Tracking
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  CICO Timeclock offers powerful yet easy-to-use features to streamline workforce management.
                </p>
                <CustomButton variant="primary">Start Free Trial</CustomButton>
              </div>
              <div className="hidden md:block">
                <img
                  className="rounded-lg shadow-2xl"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/e9f4ab2317-0df1d27f74b38035a53b.png"
                  alt="Time tracking app interface"
                />
              </div>
            </div>
          </div>
        </section>
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <div className="text-[#4BA0F4] mb-4">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Time Tracking</h3>
                <p className="text-gray-600">
                  One-tap clock-in/out with secure authentication for seamless time tracking.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <div className="text-[#008000] mb-4">
                  <FolderTree className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Project-Based Logging</h3>
                <p className="text-gray-600">
                  Assign time entries to specific projects for accurate billing and tracking.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <div className="text-[#4BA0F4] mb-4">
                  <Camera className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Photo Capture & Geolocation</h3>
                <p className="text-gray-600">
                  Prevent time fraud with identity verification and location tracking.
                </p>
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
