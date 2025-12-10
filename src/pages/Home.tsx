import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CustomButton } from "@/components/ui/custom-button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Camera, MapPin, BarChart3 } from "lucide-react";

const Home = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Camera,
      title: "Photo Verification",
      description: "Capture photos during clock-in and clock-out to verify employee attendance with visual confirmation.",
    },
    {
      icon: MapPin,
      title: "Location Tracking",
      description: "Ensure employees are clocking in from authorized locations with GPS verification.",
    },
    {
      icon: BarChart3,
      title: "Real-Time Reports",
      description: "Access detailed time tracking reports instantly to manage payroll and track productivity.",
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-white mt-[65px] px-20 py-24 max-sm:p-4">
        <div className="max-w-screen-xl flex justify-between items-center mx-auto my-0 max-md:px-10 max-md:py-0 max-sm:flex-col max-sm:gap-12 max-sm:text-center">
          <div className="max-w-[570px] max-sm:mb-8">
            <h1 className="text-5xl font-bold leading-[48px] text-gray-900 mb-8 max-sm:text-4xl max-sm:leading-10">
              Track Time, Not Paperwork
            </h1>
            <p className="text-xl leading-5 text-gray-600 mb-14 max-sm:text-lg">
              Secure time tracking with photo verification and location tracking
              for modern businesses.
            </p>
            <div className="flex gap-4 max-sm:flex-col max-sm:gap-4">
              <CustomButton
                variant="primary"
                onClick={() => window.location.href = "/company-signup"}
              >
                Start Free Trial
              </CustomButton>
              <CustomButton
                variant="secondary"
                onClick={() => window.location.href = "/features"}
              >
                Features
              </CustomButton>
            </div>
          </div>
          <div className="w-[640px] h-[640px] flex justify-center items-center shadow-[0_25px_50px_rgba(0,0,0,0.25)] rounded-lg max-md:w-[480px] max-md:h-[480px] max-sm:w-full max-sm:h-auto max-sm:p-8 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="w-[272px] h-[552px] bg-foreground rounded-[3rem] p-2 shadow-xl max-md:w-[220px] max-md:h-[447px] max-sm:w-40 max-sm:h-[325px]">
              <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden flex flex-col">
                <div className="bg-primary p-4 text-primary-foreground">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">CICOTimeclock</span>
                  </div>
                  <p className="text-xs opacity-80">Welcome back!</p>
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Photo Verify</span>
                    </div>
                    <div className="w-full h-16 bg-muted-foreground/10 rounded flex items-center justify-center">
                      <Camera className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Location</span>
                    </div>
                    <p className="text-xs text-muted-foreground">GPS Active</p>
                  </div>
                  <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium">
                    Clock In
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 px-20 py-24 max-sm:p-4">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features to streamline your workforce management
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-center"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary px-20 py-24 max-sm:p-8">
        <div className="max-w-screen-xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses using CICO Timeclock to manage their workforce.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <CustomButton
              variant="secondary"
              onClick={() => window.location.href = "/company-signup"}
            >
              Start Free Trial
            </CustomButton>
            <CustomButton
              variant="outline"
              onClick={() => window.location.href = "/contact"}
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
            >
              Contact Sales
            </CustomButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Home;
