import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmployeeHeader } from "@/components/employee/EmployeeHeader";
import { EmployeeTabs } from "@/components/employee/EmployeeTabs";
import { useEmployeeDetail } from "@/hooks/useEmployeeDetail";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <EmployeeHeader 
          employee={employee} 
          navigation={navigation}
          onRefetch={refetch}
        />
        <EmployeeTabs 
          employee={employee} 
          onRefetch={refetch}
        />
      </div>
    </DashboardLayout>
  );
};

export default EmployeeDetail;
