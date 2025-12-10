import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const Pricing = () => {
  const { t } = useLanguage();

  const plans = [
    {
      name: t("planFree"),
      price: "$0",
      period: t("perMonth"),
      description: t("planFreeDesc"),
      features: [
        t("planFreeFeature1"),
        t("planFreeFeature2"),
        t("planFreeFeature3"),
        t("planFreeFeature4"),
      ],
      cta: t("getStarted"),
      popular: false,
    },
    {
      name: t("planPro"),
      price: "$9",
      period: t("perUserMonth"),
      description: t("planProDesc"),
      features: [
        t("planProFeature1"),
        t("planProFeature2"),
        t("planProFeature3"),
        t("planProFeature4"),
        t("planProFeature5"),
      ],
      cta: t("startFreeTrial"),
      popular: true,
    },
    {
      name: t("planEnterprise"),
      price: t("custom"),
      period: "",
      description: t("planEnterpriseDesc"),
      features: [
        t("planEnterpriseFeature1"),
        t("planEnterpriseFeature2"),
        t("planEnterpriseFeature3"),
        t("planEnterpriseFeature4"),
        t("planEnterpriseFeature5"),
        t("planEnterpriseFeature6"),
      ],
      cta: t("contactSales"),
      popular: false,
    },
  ];

  return (
    <PublicLayout>
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("pricingTitle")}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("pricingSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      {t("mostPopular")}
                    </span>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground ml-2">{plan.period}</span>
                    )}
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to={plan.name === t("planEnterprise") ? "/contact" : "/company-signup"}>
                      {plan.cta}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Pricing;
