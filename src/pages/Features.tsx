import { PublicLayout } from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Clock, 
  Users, 
  FileText, 
  Shield, 
  Smartphone, 
  BarChart3, 
  Camera, 
  MapPin,
  QrCode,
  Bell,
  Settings,
  Globe
} from "lucide-react";

const Features = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Clock,
      title: "Time Clock",
      description: "Easy clock-in and clock-out with a simple, intuitive interface. Track working hours with precision and reliability.",
    },
    {
      icon: Camera,
      title: "Photo Verification",
      description: "Capture photos during time punches to verify employee identity and prevent buddy punching.",
    },
    {
      icon: MapPin,
      title: "GPS Location Tracking",
      description: "Verify employee locations during clock-in/out. Ensure staff are at authorized work sites.",
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Manage employees, departments, and roles. Assign permissions and track team performance.",
    },
    {
      icon: FileText,
      title: "Detailed Reports",
      description: "Generate comprehensive timecard reports for payroll. Export to CSV or PDF for easy processing.",
    },
    {
      icon: QrCode,
      title: "Badge & QR Codes",
      description: "Generate employee badges with QR codes for quick identification and task verification.",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with encrypted data storage and secure authentication.",
    },
    {
      icon: Bell,
      title: "Scheduled Reports",
      description: "Automate report delivery with scheduled email reports to stakeholders.",
    },
    {
      icon: Smartphone,
      title: "Mobile Friendly",
      description: "Access the timeclock from any device. Responsive design works on phones, tablets, and desktops.",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Visual dashboards showing attendance trends, overtime, and productivity metrics.",
    },
    {
      icon: Settings,
      title: "Customizable",
      description: "Configure settings to match your business needs. Enable or disable features as required.",
    },
    {
      icon: Globe,
      title: "Multi-Language",
      description: "Support for English, Spanish, and French. Easily switch between languages.",
    },
  ];

  return (
    <PublicLayout>
      <div className="bg-white py-24 mt-[65px]">
        <div className="max-w-screen-xl mx-auto px-4 md:px-20">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Powerful Features
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage employee time tracking, from simple clock-in/out to advanced reporting and analytics.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-20">
            <p className="text-lg text-gray-600 mb-6">
              Ready to streamline your time tracking?
            </p>
            <a
              href="/company-signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Features;
