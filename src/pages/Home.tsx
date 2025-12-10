import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Camera, MapPin, TrendingUp, Smartphone } from "lucide-react";

const Home = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Camera,
      title: t("home.feature.photo.title"),
      description: t("home.feature.photo.desc"),
    },
    {
      icon: MapPin,
      title: t("home.feature.location.title"),
      description: t("home.feature.location.desc"),
    },
    {
      icon: TrendingUp,
      title: t("home.feature.reports.title"),
      description: t("home.feature.reports.desc"),
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-br from-muted/50 via-background to-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                {t("home.hero.title")}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">
                {t("home.hero.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link to="/company-signup">
                    {t("home.hero.cta")}
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground" asChild>
                  <Link to="/features">{t("nav.features")}</Link>
                </Button>
              </div>
            </div>
            {/* Phone Mockup */}
            <div className="flex justify-center md:justify-end">
              <div className="relative">
                <div className="w-64 md:w-72 lg:w-80 h-[500px] md:h-[560px] lg:h-[620px] bg-foreground rounded-[3rem] p-3 shadow-2xl">
                  <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden flex flex-col">
                    {/* Phone Screen Content */}
                    <div className="bg-primary p-4 text-primary-foreground">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">CICOTimeclock</span>
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <p className="text-xs opacity-80">{t("home.phone.welcome")}</p>
                    </div>
                    <div className="flex-1 p-4 space-y-3">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{t("home.phone.photoVerify")}</span>
                        </div>
                        <div className="w-full h-20 bg-muted-foreground/10 rounded flex items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{t("home.phone.location")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{t("home.phone.locationActive")}</p>
                      </div>
                      <Button className="w-full" size="lg">
                        {t("timeclock.clockIn")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.features.title")}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("home.features.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow text-center"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.cta.title")}</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            {t("home.cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/company-signup">{t("home.hero.cta")}</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <Link to="/contact">{t("home.cta.contact")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Home;
