import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock, Users, FileText, Shield, Smartphone, BarChart3, ArrowRight, CheckCircle } from "lucide-react";

const Home = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Clock,
      title: t("featureTimeClock"),
      description: t("featureTimeClockDesc"),
    },
    {
      icon: Users,
      title: t("featureTeamManagement"),
      description: t("featureTeamManagementDesc"),
    },
    {
      icon: FileText,
      title: t("featureReporting"),
      description: t("featureReportingDesc"),
    },
    {
      icon: Shield,
      title: t("featureSecurity"),
      description: t("featureSecurityDesc"),
    },
    {
      icon: Smartphone,
      title: t("featureMobile"),
      description: t("featureMobileDesc"),
    },
    {
      icon: BarChart3,
      title: t("featureAnalytics"),
      description: t("featureAnalyticsDesc"),
    },
  ];

  const benefits = [
    t("benefit1"),
    t("benefit2"),
    t("benefit3"),
    t("benefit4"),
    t("benefit5"),
    t("benefit6"),
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              {t("heroTitle")}
              <span className="text-primary"> {t("heroTitleHighlight")}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/company-signup">
                  {t("getStartedFree")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/features">{t("learnMore")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("featuresTitle")}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("featuresSubtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow"
              >
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("whyChoose")}</h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t("whyChooseDesc")}
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 md:p-12">
              <div className="text-center">
                <Clock className="h-24 w-24 text-primary mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-2">{t("startTracking")}</h3>
                <p className="text-muted-foreground mb-6">{t("startTrackingDesc")}</p>
                <Button asChild>
                  <Link to="/company-signup">{t("createFreeAccount")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("ctaTitle")}</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            {t("ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/company-signup">{t("getStartedFree")}</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <Link to="/contact">{t("contactSales")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Home;
