import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useActiveTimeEntry, useClockIn, useClockOut } from "@/hooks/useTimeEntries";
import { useActiveProjects } from "@/hooks/useProjects";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Play, Square, Loader2 } from "lucide-react";
import { format } from "date-fns";

const Timeclock = () => {
  const { t } = useLanguage();
  const { data: activeEntry, isLoading: loadingEntry } = useActiveTimeEntry();
  const { data: projects, isLoading: loadingProjects } = useActiveProjects();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const [selectedProject, setSelectedProject] = useState<string>("");

  const handleClockIn = async () => {
    await clockIn.mutateAsync({
      projectId: selectedProject || undefined,
    });
  };

  const handleClockOut = async () => {
    if (!activeEntry?.id) return;
    await clockOut.mutateAsync({
      entryId: activeEntry.id,
    });
  };

  const getElapsedTime = () => {
    if (!activeEntry?.start_time) return "00:00:00";
    const start = new Date(activeEntry.start_time);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const [elapsed, setElapsed] = useState(getElapsedTime());

  // Update elapsed time every second when clocked in
  useState(() => {
    if (activeEntry) {
      const interval = setInterval(() => {
        setElapsed(getElapsedTime());
      }, 1000);
      return () => clearInterval(interval);
    }
  });

  if (loadingEntry) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t("timeclock")}</h1>
          <p className="text-muted-foreground mt-1">{t("timeclockDescription")}</p>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">{t("currentStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8 space-y-6">
            {/* Status Indicator */}
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-colors ${
                activeEntry
                  ? "bg-green-500/20 border-4 border-green-500"
                  : "bg-muted border-4 border-muted-foreground/20"
              }`}
            >
              {activeEntry ? (
                <Play className="h-16 w-16 text-green-500" />
              ) : (
                <Square className="h-16 w-16 text-muted-foreground" />
              )}
            </div>

            {/* Status Text */}
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">
                {activeEntry ? t("clockedIn") : t("clockedOut")}
              </p>
              {activeEntry && (
                <>
                  <p className="text-4xl font-mono font-bold text-primary">{elapsed}</p>
                  <p className="text-muted-foreground">
                    {t("startedAt")} {format(new Date(activeEntry.start_time), "h:mm a")}
                  </p>
                  {activeEntry.projects && (
                    <p className="text-sm text-muted-foreground">
                      {t("project")}: {activeEntry.projects.name}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Project Selection (only when clocking in) */}
            {!activeEntry && projects && projects.length > 0 && (
              <div className="w-full max-w-xs">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectProject")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("noProject")}</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Clock In/Out Button */}
            <Button
              size="lg"
              className="w-full max-w-xs h-14 text-lg"
              variant={activeEntry ? "destructive" : "default"}
              onClick={activeEntry ? handleClockOut : handleClockIn}
              disabled={clockIn.isPending || clockOut.isPending}
            >
              {(clockIn.isPending || clockOut.isPending) && (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              )}
              <Clock className="mr-2 h-5 w-5" />
              {activeEntry ? t("clockOut") : t("clockIn")}
            </Button>
          </CardContent>
        </Card>

        {/* Current Time */}
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t("currentTime")}</p>
              <p className="text-2xl font-mono">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
              <p className="text-3xl font-mono font-bold">{format(new Date(), "h:mm:ss a")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Timeclock;
