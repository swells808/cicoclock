import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Mail, MoreHorizontal, Edit, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmployeeProfile } from "@/hooks/useEmployeeDetail";
import { format } from "date-fns";

interface EmployeeHeaderProps {
  employee: EmployeeProfile;
  navigation: {
    currentIndex: number;
    total: number;
    previousId: string | null;
    nextId: string | null;
  };
  onRefetch: () => void;
}

export const EmployeeHeader = ({ employee, navigation, onRefetch }: EmployeeHeaderProps) => {
  const navigate = useNavigate();

  const getInitials = () => {
    const first = employee.first_name?.[0] || "";
    const last = employee.last_name?.[0] || "";
    return (first + last).toUpperCase() || employee.display_name?.[0]?.toUpperCase() || "?";
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "inactive":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "deactivated":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(" ") 
    || employee.display_name 
    || "Unknown";

  const handleSendEmail = () => {
    if (employee.email) {
      window.location.href = `mailto:${employee.email}`;
    }
  };

  return (
    <div className="bg-card rounded-lg border p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Back + Avatar + Info */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/users")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Avatar className="h-14 w-14 md:h-16 md:w-16 shrink-0">
            <AvatarImage src={employee.avatar_url || undefined} alt={fullName} />
            <AvatarFallback className="text-lg font-medium bg-primary/10 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{fullName}</h1>
              <Badge className={getStatusColor(employee.status)}>
                {employee.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
              {employee.employee_id && (
                <span>ID: {employee.employee_id}</span>
              )}
              {employee.department_name && (
                <span className="hidden md:inline">• {employee.department_name}</span>
              )}
              {employee.role && (
                <Badge variant="outline" className="capitalize text-xs">
                  {employee.role}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Stats + Navigation + Actions */}
        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
          {/* Quick stats - hidden on mobile */}
          <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground border-r pr-4 mr-2">
            {employee.date_of_hire && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Hired {format(new Date(employee.date_of_hire), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              disabled={!navigation.previousId}
              onClick={() => navigation.previousId && navigate(`/employee/${navigation.previousId}`)}
              className="px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {navigation.currentIndex} of {navigation.total}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!navigation.nextId}
              onClick={() => navigation.nextId && navigate(`/employee/${navigation.nextId}`)}
              className="px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            disabled={!employee.email}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Send Email</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/users?edit=${employee.id}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Employee
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
