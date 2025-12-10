import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, Bell, Shield } from "lucide-react";

const Settings = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("settings")}</h1>
          <p className="text-muted-foreground">{t("settingsDescription")}</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              {t("profile")}
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              {t("company")}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              {t("notifications")}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              {t("security")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t("profileSettings")}</CardTitle>
                <CardDescription>{t("profileSettingsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t("comingSoon")}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>{t("companySettings")}</CardTitle>
                <CardDescription>{t("companySettingsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t("comingSoon")}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>{t("notificationSettings")}</CardTitle>
                <CardDescription>{t("notificationSettingsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t("comingSoon")}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t("securitySettings")}</CardTitle>
                <CardDescription>{t("securitySettingsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t("comingSoon")}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
