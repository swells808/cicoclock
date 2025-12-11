import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CustomButton } from "@/components/ui/custom-button";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: Json | null;
  stripe_price_id: string | null;
}

const Pricing = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, price, features, stripe_price_id');
      if (!error && data) {
        setPlans(data);
      }
      setIsLoading(false);
    })();
  }, []);

  const personal = plans?.find(plan =>
    plan.name.toLowerCase().includes('personal')
  );
  const pro = plans?.find(plan =>
    plan.name.toLowerCase().includes('pro')
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="pt-16">
        <section className="bg-gradient-to-b from-gray-50 to-white py-20 relative">
          <div className="absolute inset-0 overflow-hidden z-0">
            <img
              src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"
              alt="Business laptop workspace"
              className="w-full h-full object-cover opacity-10"
            />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple & Transparent Pricing<br />Start Your 30-Day Free Trial Today!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </section>
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Personal Plan */}
              <div className="border border-gray-200 rounded-xl p-8 bg-white shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold mb-2">Personal Plan</h3>
                <p className="text-gray-600 mb-4">For Solopreneurs</p>
                <div className="text-4xl font-bold mb-6">
                  {isLoading ? '...' : personal ? `$${personal.price}` : '--'}
                  <span className="text-lg text-gray-500">/month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <Check className="text-[#008000] mr-2 h-5 w-5" />
                    <span>Basic reporting</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="text-[#008000] mr-2 h-5 w-5" />
                    <span>Photo verification</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="text-[#008000] mr-2 h-5 w-5" />
                    <span>Location tracking</span>
                  </li>
                </ul>
                <CustomButton variant="secondary" className="w-full bg-[#4BA0F4] text-white hover:bg-[#4BA0F4]/90">
                  Start Free Trial
                </CustomButton>
              </div>
              {/* Pro Plan */}
              <div className="border-2 border-[#4BA0F4] rounded-xl p-8 bg-white shadow-md hover:shadow-lg transition-shadow relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#4BA0F4] text-white px-4 py-1 rounded-full text-sm">
                  Most Popular
                </div>
                <h3 className="text-xl font-semibold mb-2">Pro Plan</h3>
                <p className="text-gray-600 mb-4">For Growing Businesses</p>
                <div className="text-4xl font-bold mb-6">
                  {isLoading ? '...' : pro ? `$${pro.price}` : '--'}
                  <span className="text-lg text-gray-500">/month per user</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <Check className="text-[#008000] mr-2 h-5 w-5" />
                    <span>Everything included in Personal</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="text-[#008000] mr-2 h-5 w-5" />
                    <span>Unlimited employees</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="text-[#008000] mr-2 h-5 w-5" />
                    <span>Advanced reporting</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="text-[#008000] mr-2 h-5 w-5" />
                    <span>Advanced external software integrations</span>
                  </li>
                </ul>
                <CustomButton variant="primary" className="w-full bg-[#008000] hover:bg-[#008000]/90">
                  Start Free Trial
                </CustomButton>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
