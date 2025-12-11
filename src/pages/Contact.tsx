import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CustomButton } from "@/components/ui/custom-button";
import {
  Mail,
  Phone,
  Clock,
  MapPin,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  MessageSquare
} from "lucide-react";

const Contact = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "General Inquiry",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add form submission logic here
    console.log("Form submitted:", formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="pt-24 pb-16 bg-gradient-to-b from-blue-50/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Get in Touch with Us</h1>
              <p className="text-xl text-gray-600 mb-8">Have questions? We're here to help. Reach out to our team anytime.</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
              <div className="space-y-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Mail className="text-[#4BA0F4] w-6 h-6" />
                      <span>support@cicotimeclock.com</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Phone className="text-[#4BA0F4] w-6 h-6" />
                      <span>+1 (702) 577-2193</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Clock className="text-[#4BA0F4] w-6 h-6" />
                      <span>Monday–Friday, 9 AM–4 PM (PST)</span>
                    </div>
                    <div className="flex items-start space-x-4">
                      <MapPin className="text-[#4BA0F4] w-6 h-6 mt-1" />
                      <span>7995 Blue Diamond Blvd. Ste. 102-247<br />Las Vegas, NV 89178 USA</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold mb-6">Connect With Us</h3>
                  <div className="flex space-x-6">
                    <a href="#" className="text-gray-600 hover:text-[#4BA0F4] transition-colors">
                      <Linkedin className="w-6 h-6" />
                    </a>
                    <a href="#" className="text-gray-600 hover:text-[#4BA0F4] transition-colors">
                      <Twitter className="w-6 h-6" />
                    </a>
                    <a href="#" className="text-gray-600 hover:text-[#4BA0F4] transition-colors">
                      <Facebook className="w-6 h-6" />
                    </a>
                    <a href="#" className="text-gray-600 hover:text-[#4BA0F4] transition-colors">
                      <Instagram className="w-6 h-6" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold mb-6">Send us a Message</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input 
                      type="text" 
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4BA0F4] focus:border-transparent" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4BA0F4] focus:border-transparent" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <select 
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4BA0F4] focus:border-transparent"
                    >
                      <option>General Inquiry</option>
                      <option>Technical Support</option>
                      <option>Billing</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea 
                      rows={4} 
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4BA0F4] focus:border-transparent"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                    <input 
                      type="file" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4BA0F4] focus:border-transparent" 
                    />
                  </div>
                  <CustomButton variant="primary" className="w-full">Send Message</CustomButton>
                </form>
              </div>
            </div>
          </div>
        </section>

        <button className="fixed bottom-6 right-6 bg-[#4BA0F4] text-white p-4 rounded-full shadow-lg hover:bg-[#3b80c4] transition-colors">
          <MessageSquare className="w-6 h-6" />
        </button>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
