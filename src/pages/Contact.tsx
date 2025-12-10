import { useState } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mail, Phone, MapPin, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Message sent successfully! We'll get back to you soon.");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setLoading(false);
  };

  return (
    <PublicLayout>
      <div className="bg-white py-24 mt-[65px]">
        <div className="max-w-screen-xl mx-auto px-4 md:px-20">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 max-w-5xl mx-auto">
            {/* Contact Form */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors resize-none"
                    placeholder="Your message..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
                <p className="text-gray-600 mb-8">
                  Reach out to us through any of the following channels. We typically respond within 24 hours.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email Us</h3>
                    <p className="text-gray-600">support@cico.app</p>
                    <p className="text-gray-600">sales@cico.app</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
                    <p className="text-gray-600">+1 (555) 123-4567</p>
                    <p className="text-sm text-gray-500">Mon-Fri 9am-6pm PST</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Visit Us</h3>
                    <p className="text-gray-600">
                      123 Business Ave, Suite 100<br />
                      San Francisco, CA 94102<br />
                      United States
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contact;
