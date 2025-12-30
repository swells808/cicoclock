import React from "react";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Department {
  id: string;
  name: string;
}

interface UserFiltersProps {
  searchQuery: string;
  selectedRole: string;
  selectedStatus: string;
  selectedDepartment: string;
  departments: Department[];
  onSearch: (query: string) => void;
  onRoleFilter: (role: string) => void;
  onStatusFilter: (status: string) => void;
  onDepartmentFilter: (department: string) => void;
}

export const UserFilters: React.FC<UserFiltersProps> = ({
  searchQuery,
  selectedRole,
  selectedStatus,
  selectedDepartment,
  departments,
  onSearch,
  onRoleFilter,
  onStatusFilter,
  onDepartmentFilter
}) => {

  return (
    <div className="bg-card rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex-1 relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9 pr-4 py-2 border border-border rounded-md w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      <div className="flex gap-4 w-full md:w-auto flex-wrap">
        <div className="w-[calc(50%-0.5rem)] md:w-auto">
          <Select
            value={selectedRole}
            onValueChange={onRoleFilter}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-roles">All Roles</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
              <SelectItem value="Foreman">Foreman</SelectItem>
              <SelectItem value="Employee">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[calc(50%-0.5rem)] md:w-auto">
          <Select
            value={selectedStatus}
            onValueChange={onStatusFilter}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[calc(50%-0.5rem)] md:w-auto">
          <Select
            value={selectedDepartment}
            onValueChange={onDepartmentFilter}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-departments">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.name}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
