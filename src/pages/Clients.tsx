import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

const Clients = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("clients")}</h1>
          <p className="text-muted-foreground">{t("clientsDescription")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("clientList")}</CardTitle>
            <CardDescription>{t("clientListDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("comingSoon")}</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Clients;
