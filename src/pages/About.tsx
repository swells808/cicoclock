import { PublicLayout } from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock, Users, Target, Award } from "lucide-react";

const About = () => {
  const { t } = useLanguage();

  const values = [
    {
      icon: Clock,
      title: t("valueSimplicity"),
      description: t("valueSimplicityDesc"),
    },
    {
      icon: Users,
      title: t("valueTeamwork"),
      description: t("valueTeamworkDesc"),
    },
    {
      icon: Target,
      title: t("valueAccuracy"),
      description: t("valueAccuracyDesc"),
    },
    {
      icon: Award,
      title: t("valueExcellence"),
      description: t("valueExcellenceDesc"),
    },
  ];

  return (
    <PublicLayout>
      <div className="py-20">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("aboutTitle")}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("aboutSubtitle")}
            </p>
          </div>

          {/* Mission */}
          <div className="max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl font-bold mb-6 text-center">{t("ourMission")}</h2>
            <p className="text-lg text-muted-foreground text-center">
              {t("ourMissionDesc")}
            </p>
          </div>

          {/* Values */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-12 text-center">{t("ourValues")}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default About;
