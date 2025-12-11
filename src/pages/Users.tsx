import React, { useState } from "react";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { UserStats } from "@/components/users/UserStats";
import { UserTable } from "@/components/users/UserTable";
import { UserFilters } from "@/components/users/UserFilters";
import { CSVImportModal } from "@/components/users/CSVImportModal";
import { ExportUsersDropdown } from "@/components/users/ExportUsersDropdown";
import { UserDialog } from "@/components/users/UserDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Upload, UserPlus, Award, Shield, UserCog, X, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers, User } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Users = () => {
  const { signOut } = useAuth();
  const { users, loading, refetch, updateUserStatus } = useUsers();
  const { departments } = useDepartments();
  const { isAdmin } = useUserRole();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all-roles");
  const [selectedStatus, setSelectedStatus] = useState<string>("all-status");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all-departments");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Filter logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole === "all-roles" || user.role === selectedRole;
    const matchesStatus = selectedStatus === "all-status" || user.status === selectedStatus;
    const matchesDepartment = selectedDepartment === "all-departments" || user.department === selectedDepartment;

    return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
  }).sort((a, b) => {
    // Sort deactivated users to the bottom
    if (a.status === "Deactivated" && b.status !== "Deactivated") return 1;
    if (a.status !== "Deactivated" && b.status === "Deactivated") return -1;
    return a.name.localeCompare(b.name);
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  // Stats
  const activeUsers = users.filter(user => user.status === "Active").length;
  const pendingApprovals = users.filter(user => user.status === "Pending" || user.status === "Inactive").length;
  const newUsersThisMonth = users.length > 0 ? Math.min(5, users.length) : 0; // Placeholder - original repo tracked creation dates

  // Handlers
  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await updateUserStatus(userToDelete.id, 'deactivated');
      toast.success('User deactivated successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err) {
      toast.error('Failed to deactivate user');
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedUsers([]);
  };

  // Bulk actions
  const handleBulkStatusChange = async (status: 'active' | 'inactive' | 'deactivated') => {
    if (selectedUsers.length === 0) return;
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .in('id', selectedUsers);

      if (error) throw error;

      toast.success(`${selectedUsers.length} user(s) updated to ${status}`);
      setSelectedUsers([]);
      refetch();
    } catch (err) {
      toast.error('Failed to update users');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRoleChange = async (role: 'admin' | 'supervisor' | 'employee') => {
    if (selectedUsers.length === 0) return;
    setBulkActionLoading(true);
    try {
      const selectedUserData = users.filter(u => selectedUsers.includes(u.id));

      for (const user of selectedUserData) {
        const roleKey = user.user_id || user.id;

        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .or(`user_id.eq.${roleKey},profile_id.eq.${user.id}`)
          .maybeSingle();

        if (existingRole) {
          await supabase
            .from('user_roles')
            .update({ role })
            .eq('id', existingRole.id);
        } else {
          await supabase
            .from('user_roles')
            .insert({
              user_id: roleKey,
              profile_id: user.id,
              role,
            });
        }
      }

      toast.success(`${selectedUsers.length} user(s) role updated to ${role}`);
      setSelectedUsers([]);
      refetch();
    } catch (err) {
      toast.error('Failed to update roles');
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StandardHeader />
        <main className="pt-20 pb-20 px-4">
          <div className="container mx-auto">
            <div className="text-center py-10">Loading users...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StandardHeader />
      <main className="pt-20 pb-20 px-4">
        <div className="container mx-auto">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Management</h1>
              <p className="text-muted-foreground">Manage employees, roles, and permissions</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setIsCSVImportOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <ExportUsersDropdown users={filteredUsers} selectedUsers={selectedUsers} />
              {isAdmin && (
                <Button onClick={handleAddUser} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Employee
                </Button>
              )}
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedUsers.length > 0 && (
            <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {selectedUsers.length} selected
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={bulkActionLoading} className="gap-2">
                            <UserCog className="h-4 w-4" />
                            Change Status
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleBulkStatusChange('active')}>Set Active</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkStatusChange('inactive')}>Set Inactive</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleBulkStatusChange('deactivated')} className="text-destructive">
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={bulkActionLoading} className="gap-2">
                            <Shield className="h-4 w-4" />
                            Change Role
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleBulkRoleChange('employee')}>Set as Employee</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkRoleChange('supervisor')}>Set as Manager</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkRoleChange('admin')}>Set as Admin</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* User Stats */}
          <UserStats
            activeUsers={activeUsers}
            pendingApprovals={pendingApprovals}
            newUsers={newUsersThisMonth}
            activeUsersChange={newUsersThisMonth}
          />

          {/* Filters */}
          <UserFilters
            searchQuery={searchQuery}
            selectedRole={selectedRole}
            selectedStatus={selectedStatus}
            selectedDepartment={selectedDepartment}
            departments={departments}
            onSearch={setSearchQuery}
            onRoleFilter={setSelectedRole}
            onStatusFilter={setSelectedStatus}
            onDepartmentFilter={setSelectedDepartment}
          />

          {/* User Table */}
          <UserTable
            users={paginatedUsers}
            selectedUsers={selectedUsers}
            onUserClick={handleUserClick}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteClick}
            onUserSelect={handleUserSelect}
            onSelectAll={handleSelectAll}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length}</span>
                <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-background border-t border-border shadow-sm z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex space-x-6">
              <a href="#" className="hover:text-primary">Support</a>
              <a href="#" className="hover:text-primary">Privacy Policy</a>
            </div>
            <button onClick={signOut} className="text-destructive hover:text-destructive/80">Logout</button>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <UserDialog
        open={isUserDialogOpen}
        onOpenChange={setIsUserDialogOpen}
        user={selectedUser}
        onSave={refetch}
      />

      <CSVImportModal
        open={isCSVImportOpen}
        onOpenChange={setIsCSVImportOpen}
        onImportComplete={refetch}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {userToDelete?.name}? They will no longer be able to clock in or access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
