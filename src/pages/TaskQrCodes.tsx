import React, { useState, useMemo } from "react";
import { Printer, AlertCircle, CheckSquare, Square } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { useAllProjectTasks, ProjectTaskWithDetails } from "@/hooks/useAllProjectTasks";
import { useProjects } from "@/hooks/useProjects";
import QRCode from "qrcode";
import { format } from "date-fns";

const TaskQrCodes: React.FC = () => {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { data: tasks = [], isLoading: tasksLoading } = useAllProjectTasks();
  const { data: projects = [] } = useProjects();
  
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get unique statuses from tasks
  const statuses = useMemo(() => {
    const statusSet = new Set(tasks.map((t) => t.status || "pending"));
    return Array.from(statusSet);
  }, [tasks]);

  // Filter tasks based on filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesProject = projectFilter === "all" || task.project_id === projectFilter;
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesProject && matchesStatus;
    });
  }, [tasks, projectFilter, statusFilter]);

  const handleSelectAll = () => {
    setSelectedTasks(new Set(filteredTasks.map((t) => t.id)));
  };

  const handleSelectNone = () => {
    setSelectedTasks(new Set());
  };

  const handleToggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handlePrintSelected = async () => {
    const selectedTasksList = filteredTasks.filter((t) => selectedTasks.has(t.id));
    if (selectedTasksList.length === 0) return;

    // Generate QR codes for selected tasks
    const qrPromises = selectedTasksList.map(async (task) => {
      const qrData = JSON.stringify({
        taskId: task.id,
        projectId: task.project_id,
        taskName: task.name,
      });
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
      });
      return { task, qrDataUrl };
    });

    const qrResults = await Promise.all(qrPromises);

    // Open print window
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const qrCardsHtml = qrResults
        .map(
          ({ task, qrDataUrl }) => `
        <div style="page-break-inside: avoid; margin: 20px; padding: 20px; border: 1px solid #ddd; display: inline-block; text-align: center; width: 280px;">
          <h3 style="margin: 0 0 5px 0; font-size: 16px;">${task.name}</h3>
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">${task.project?.name || "No Project"}</p>
          <img src="${qrDataUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
          <p style="margin: 10px 0 0 0; font-size: 10px; color: #999;">ID: ${task.id.substring(0, 8)}...</p>
        </div>
      `
        )
        .join("");

      printWindow.document.write(`
        <html>
          <head>
            <title>Task QR Codes</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                padding: 20px;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1 style="text-align: center; margin-bottom: 30px;">Task QR Codes</h1>
            <div style="display: flex; flex-wrap: wrap; justify-content: center;">
              ${qrCardsHtml}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getAssigneeName = (task: ProjectTaskWithDetails) => {
    if (!task.assignee) return "Unassigned";
    if (task.assignee.display_name) return task.assignee.display_name;
    if (task.assignee.first_name || task.assignee.last_name) {
      return `${task.assignee.first_name || ""} ${task.assignee.last_name || ""}`.trim();
    }
    return task.assignee.email || "Unassigned";
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    }
  };

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="py-8 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You must be an administrator to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Filters & Actions */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Filters & Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Filter by Project
              </label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Filter by Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selection Buttons */}
            <div className="flex flex-col gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleSelectAll}
                className="w-full justify-start"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All ({filteredTasks.length})
              </Button>
              <Button
                variant="outline"
                onClick={handleSelectNone}
                className="w-full justify-start"
              >
                <Square className="h-4 w-4 mr-2" />
                Select None
              </Button>
            </div>

            {/* Print Button */}
            <Button
              onClick={handlePrintSelected}
              disabled={selectedTasks.size === 0}
              className="w-full mt-4"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Selected ({selectedTasks.size})
            </Button>
          </CardContent>
        </Card>

        {/* Right Column - Project Tasks List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              Project Tasks ({filteredTasks.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select tasks to generate QR codes for printing
            </p>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tasks found matching the selected filters.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => handleToggleTask(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {task.project?.name || "No Project"}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-foreground truncate">{task.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <Badge
                          variant="secondary"
                          className={getStatusColor(task.status)}
                        >
                          {(task.status || "pending")
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                        <span>Assigned to: {getAssigneeName(task)}</span>
                        {task.due_date && (
                          <span>
                            Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {task.id.substring(0, 8)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TaskQrCodes;
