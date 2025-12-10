import { PublicLayout } from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock, Users, FileText, Shield, Smartphone, BarChart3, Zap, Globe } from "lucide-react";

const Features = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Clock,
      title: t("featureTimeClock"),
      description: t("featureTimeClockDescLong"),
    },
    {
      icon: Users,
      title: t("featureTeamManagement"),
      description: t("featureTeamManagementDescLong"),
    },
    {
      icon: FileText,
      title: t("featureReporting"),
      description: t("featureReportingDescLong"),
    },
    {
      icon: Shield,
      title: t("featureSecurity"),
      description: t("featureSecurityDescLong"),
    },
    {
      icon: Smartphone,
      title: t("featureMobile"),
      description: t("featureMobileDescLong"),
    },
    {
      icon: BarChart3,
      title: t("featureAnalytics"),
      description: t("featureAnalyticsDescLong"),
    },
    {
      icon: Zap,
      title: t("featureAutomation"),
      description: t("featureAutomationDescLong"),
    },
    {
      icon: Globe,
      title: t("featureMultilingual"),
      description: t("featureMultilingualDescLong"),
    },
  ];

  return (
    <PublicLayout>
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("featuresPageTitle")}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("featuresPageSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow"
              >
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Features;
