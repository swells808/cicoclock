import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Shield, UserCheck, Share2, Cookie } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="mt-20">
        <section className="bg-gradient-to-b from-blue-50 to-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your privacy is important to us. Learn how we collect, use, and protect your information.
            </p>
            <div className="mt-6 text-sm text-gray-500">Last updated: March 15, 2025</div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="prose prose-lg max-w-none">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
                <h2 className="text-2xl font-semibold mb-6">Quick Summary</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <Shield className="w-5 h-5 text-[#008000] mt-1" />
                      <div>
                        <h3 className="font-medium">Data Protection</h3>
                        <p className="text-gray-600">We use industry-standard security measures to protect your data</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <UserCheck className="w-5 h-5 text-[#4BA0F4] mt-1" />
                      <div>
                        <h3 className="font-medium">Your Rights</h3>
                        <p className="text-gray-600">Access, correct, or delete your personal information anytime</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <Share2 className="w-5 h-5 text-[#008000] mt-1" />
                      <div>
                        <h3 className="font-medium">Data Sharing</h3>
                        <p className="text-gray-600">We never sell your personal information to third parties</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <Cookie className="w-5 h-5 text-[#4BA0F4] mt-1" />
                      <div>
                        <h3 className="font-medium">Cookies Usage</h3>
                        <p className="text-gray-600">Essential cookies for functionality and your preferences</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Policy Content */}
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">Introduction</h2>
                  <p className="text-gray-700 mb-4">This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
                  <p className="text-gray-700">We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>Personal identification information (Name, email address, phone number, etc.)</li>
                    <li>Usage data (How you interact with our service)</li>
                    <li>Device information</li>
                    <li>Location data (with your permission)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">How We Use Your Data</h2>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>To provide and maintain our service</li>
                    <li>To notify you about changes to our service</li>
                    <li>To provide customer support</li>
                    <li>To gather analysis or valuable information to improve our service</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">Data Security</h2>
                  <p className="text-gray-700">The security of your data is important to us. We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.</p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
                  <p className="text-gray-700 mb-4">You have the right to:</p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>Access your personal data</li>
                    <li>Correct any inaccurate information</li>
                    <li>Request deletion of your data</li>
                    <li>Object to processing of your data</li>
                    <li>Data portability</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                  <p className="text-gray-700 mb-4">If you have any questions about this Privacy Policy, please contact us:</p>
                  <ul className="list-none space-y-2 text-gray-700">
                    <li>Email: privacy@cicotimeclock.com</li>
                    <li>Address: 7995 Blue Diamond Blvd. Ste. 102-247, Las Vegas, NV 89178 USA</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
