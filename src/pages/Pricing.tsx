import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check } from "lucide-react";

const Pricing = () => {
  const { t } = useLanguage();

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 5 employees",
        "Basic time tracking",
        "Daily reports",
        "Email support",
      ],
      cta: "Get Started",
      ctaLink: "/company-signup",
      popular: false,
      buttonStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    },
    {
      name: "Pro",
      price: "$9",
      period: "/user/month",
      description: "For growing teams that need more features",
      features: [
        "Unlimited employees",
        "Photo verification",
        "GPS location tracking",
        "Advanced reports",
        "Scheduled reports",
        "Priority support",
      ],
      cta: "Start Free Trial",
      ctaLink: "/company-signup",
      popular: true,
      buttonStyle: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with custom needs",
      features: [
        "Everything in Pro",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee",
        "On-premise deployment",
        "24/7 phone support",
      ],
      cta: "Contact Sales",
      ctaLink: "/contact",
      popular: false,
      buttonStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    },
  ];

  return (
    <PublicLayout>
      <div className="bg-white py-24 mt-[65px]">
        <div className="max-w-screen-xl mx-auto px-4 md:px-20">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that's right for your business. All plans include a 14-day free trial.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl p-8 ${
                  plan.popular 
                    ? "border-2 border-primary shadow-xl scale-105" 
                    : "border border-gray-200 shadow-sm"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                    {plan.period && (
                      <span className="text-gray-500">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-3">{plan.description}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.ctaLink}
                  className={`block w-full py-3 px-6 rounded-lg text-center font-semibold transition-colors ${plan.buttonStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* FAQ Teaser */}
          <div className="text-center mt-20">
            <p className="text-gray-600">
              Have questions?{" "}
              <Link to="/contact" className="text-primary font-semibold hover:underline">
                Contact us
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Pricing;
