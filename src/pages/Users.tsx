import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users as UsersIcon, Loader2 } from "lucide-react";

const Users = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("users")}</h1>
          <p className="text-muted-foreground">{t("usersDescription")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("teamMembers")}</CardTitle>
            <CardDescription>{t("teamMembersDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("comingSoon")}</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Users;
