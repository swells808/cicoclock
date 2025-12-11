import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User } from '@/hooks/useUsers';
import { toast } from 'sonner';

interface ExportUsersDropdownProps {
  users: User[];
  selectedUsers: string[];
}

export const ExportUsersDropdown: React.FC<ExportUsersDropdownProps> = ({
  users,
  selectedUsers,
}) => {
  const exportToCSV = (usersToExport: User[]) => {
    if (usersToExport.length === 0) {
      toast.error('No users to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Department', 'Role', 'Status', 'Employee ID'];
    const csvContent = [
      headers.join(','),
      ...usersToExport.map(user => [
        `"${user.name}"`,
        `"${user.email}"`,
        `"${user.phone || ''}"`,
        `"${user.department || ''}"`,
        `"${user.role}"`,
        `"${user.status}"`,
        `"${user.employeeId || ''}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success(`Exported ${usersToExport.length} user(s)`);
  };

  const handleExportSelected = () => {
    const selectedUserData = users.filter(u => selectedUsers.includes(u.id));
    exportToCSV(selectedUserData);
  };

  const handleExportAll = () => {
    exportToCSV(users);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {selectedUsers.length > 0 && (
          <DropdownMenuItem onClick={handleExportSelected}>
            Export Selected ({selectedUsers.length})
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleExportAll}>
          Export All Users
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
