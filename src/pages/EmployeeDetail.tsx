import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmployeeHeader } from "@/components/employee/EmployeeHeader";
import { EmployeeTabs } from "@/components/employee/EmployeeTabs";
import { useEmployeeDetail } from "@/hooks/useEmployeeDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { UserDialog } from "@/components/users/UserDialog";
import type { User } from "@/hooks/useUsers";

const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employee, loading, error, refetch, navigation } = useEmployeeDetail(id);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !employee) {
    return (
      <DashboardLayout>
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold text-foreground mb-2">Employee Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The employee you're looking for doesn't exist or you don't have access to view them.
          </p>
          <button
            onClick={() => navigate("/users")}
            className="text-primary hover:underline"
          >
            Back to Users
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Convert employee to User type for UserDialog
  const userForDialog: User | null = employee ? {
    id: employee.id,
    user_id: employee.user_id || employee.id,
    name: [employee.first_name, employee.last_name].filter(Boolean).join(" ") || employee.display_name || "",
    email: employee.email || "",
    role: employee.role === "admin" ? "Admin" : employee.role === "supervisor" ? "Manager" : "Employee",
    status: employee.status === "active" ? "Active" : employee.status === "inactive" ? "Inactive" : "Deactivated",
    lastActive: "Recently",
    avatar: employee.avatar_url || undefined,
    department: employee.department_name || "No Department",
    phone: employee.phone || undefined,
    first_name: employee.first_name || undefined,
    last_name: employee.last_name || undefined,
    display_name: employee.display_name || undefined,
    employeeId: employee.employee_id || "",
    pin: employee.pin || "",
  } : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <EmployeeHeader 
          employee={employee} 
          navigation={navigation}
          onRefetch={refetch}
          onEditEmployee={() => setIsEditDialogOpen(true)}
        />
        <EmployeeTabs 
          employee={employee} 
          onRefetch={refetch}
        />
      </div>

      {userForDialog && (
        <UserDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          user={userForDialog}
          onSave={() => {
            refetch();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default EmployeeDetail;
