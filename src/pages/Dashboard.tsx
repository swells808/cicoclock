import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useTimeEntries, useActiveTimeEntry } from "@/hooks/useTimeEntries";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users, FolderKanban, TrendingUp, Play, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

const Dashboard = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin, isSupervisor } = useUserRole();
  const { data: timeEntries } = useTimeEntries();
  const { data: activeEntry } = useActiveTimeEntry();
  const { t } = useLanguage();

  const todayEntries = timeEntries?.filter((entry) => {
    const entryDate = new Date(entry.start_time).toDateString();
    return entryDate === new Date().toDateString();
  }) || [];

  const todayMinutes = todayEntries.reduce((acc, entry) => {
    if (entry.duration_minutes) {
      return acc + entry.duration_minutes;
    }
    if (!entry.end_time) {
      const start = new Date(entry.start_time);
      return acc + Math.round((Date.now() - start.getTime()) / 60000);
    }
    return acc;
  }, 0);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold">
            {t("welcomeBack")}, {profile?.first_name || user?.email?.split("@")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">{t("dashboardSubtitle")}</p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("todayHours")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(todayMinutes)}</div>
              <p className="text-xs text-muted-foreground">
                {todayEntries.length} {t("entriesRecorded")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("currentStatus")}</CardTitle>
              {activeEntry ? (
                <Play className="h-4 w-4 text-green-500" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeEntry ? t("clockedIn") : t("clockedOut")}
              </div>
              {activeEntry && (
                <p className="text-xs text-muted-foreground">
                  {t("since")} {format(new Date(activeEntry.start_time), "h:mm a")}
                </p>
              )}
            </CardContent>
          </Card>

          {(isAdmin || isSupervisor) && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t("activeProjects")}</CardTitle>
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-xs text-muted-foreground">{t("inProgress")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t("teamMembers")}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-xs text-muted-foreground">{t("activeUsers")}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Clock Action */}
        <Card>
          <CardHeader>
            <CardTitle>{t("quickActions")}</CardTitle>
            <CardDescription>{t("quickActionsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link to="/timeclock">
                <Clock className="mr-2 h-5 w-5" />
                {activeEntry ? t("clockOut") : t("clockIn")}
              </Link>
            </Button>
            {(isAdmin || isSupervisor) && (
              <>
                <Button variant="outline" asChild size="lg">
                  <Link to="/reports">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    {t("viewReports")}
                  </Link>
                </Button>
                <Button variant="outline" asChild size="lg">
                  <Link to="/users">
                    <Users className="mr-2 h-5 w-5" />
                    {t("manageUsers")}
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
            <CardDescription>{t("recentActivityDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {timeEntries && timeEntries.length > 0 ? (
              <div className="space-y-4">
                {timeEntries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {entry.projects?.name || t("noProject")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.start_time), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {entry.duration_minutes
                          ? formatDuration(entry.duration_minutes)
                          : t("inProgress")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.start_time), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">{t("noRecentActivity")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
