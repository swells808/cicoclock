import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Briefcase, Award, Package } from "lucide-react";
import { PersonalInfoTab } from "./tabs/PersonalInfoTab";
import { WorkDetailsTab } from "./tabs/WorkDetailsTab";
import { CertificationsTab } from "./tabs/CertificationsTab";
import { AssignmentsTab } from "./tabs/AssignmentsTab";
import { EmployeeProfile } from "@/hooks/useEmployeeDetail";

interface EmployeeTabsProps {
  employee: EmployeeProfile;
  onRefetch: () => void;
}

export const EmployeeTabs = ({ employee, onRefetch }: EmployeeTabsProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "personal";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-lg flex-wrap">
        <TabsTrigger value="personal" className="gap-2 data-[state=active]:bg-background">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Personal Information</span>
          <span className="sm:hidden">Personal</span>
        </TabsTrigger>
        <TabsTrigger value="work" className="gap-2 data-[state=active]:bg-background">
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Work Details</span>
          <span className="sm:hidden">Work</span>
        </TabsTrigger>
        <TabsTrigger value="certifications" className="gap-2 data-[state=active]:bg-background">
          <Award className="h-4 w-4" />
          <span className="hidden sm:inline">Certifications</span>
          <span className="sm:hidden">Certs</span>
        </TabsTrigger>
        <TabsTrigger value="assignments" className="gap-2 data-[state=active]:bg-background">
          <Package className="h-4 w-4" />
          Assignments
        </TabsTrigger>
      </TabsList>

      <div className="mt-6">
        <TabsContent value="personal" className="m-0">
          <PersonalInfoTab employee={employee} />
        </TabsContent>

        <TabsContent value="work" className="m-0">
          <WorkDetailsTab employee={employee} onRefetch={onRefetch} />
        </TabsContent>

        <TabsContent value="certifications" className="m-0">
          <CertificationsTab profileId={employee.id} />
        </TabsContent>

        <TabsContent value="assignments" className="m-0">
          <AssignmentsTab profileId={employee.id} />
        </TabsContent>
      </div>
    </Tabs>
  );
};
