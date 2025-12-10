import React, { useState } from "react";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsersRound, Clock, UserPlus, Search, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  avatar?: string;
  department?: string;
  phone?: string;
}

const Users = () => {
  const { signOut } = useAuth();
  const { company } = useCompany();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all-roles");
  const [selectedStatus, setSelectedStatus] = useState<string>("all-status");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!company?.id) {
        setUsers([]);
        setLoading(false);
        return;
      }

      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select(`*, departments!profiles_department_id_fkey (name)`)
          .eq('company_id', company.id);

        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id, profile_id, role');

        const rolesLookup = (userRoles || []).reduce((acc: Record<string, string>, r: any) => {
          if (r.user_id) acc[r.user_id] = r.role;
          if (r.profile_id) acc[r.profile_id] = r.role;
          return acc;
        }, {});

        const roleDisplayNames: Record<string, string> = {
          'admin': 'Admin',
          'supervisor': 'Manager',
          'employee': 'Employee'
        };

        const transformedUsers: User[] = (profiles || []).map(profile => {
          const roleKey = profile.user_id || profile.id;
          const dbRole = rolesLookup[roleKey] || 'employee';
          return {
            id: profile.id,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.display_name || 'Unknown User',
            email: profile.email || 'N/A',
            role: roleDisplayNames[dbRole] || 'Employee',
            status: profile.status === 'deactivated' ? 'Deactivated' : profile.status === 'inactive' ? 'Inactive' : 'Active',
            lastActive: 'Recently',
            avatar: profile.avatar_url,
            department: profile.departments?.name || 'No Department',
            phone: profile.phone,
          };
        });

        setUsers(transformedUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [company?.id]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "all-roles" || user.role === selectedRole;
    const matchesStatus = selectedStatus === "all-status" || user.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => {
    if (a.status === "Deactivated" && b.status !== "Deactivated") return 1;
    if (a.status !== "Deactivated" && b.status === "Deactivated") return -1;
    return a.name.localeCompare(b.name);
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const activeUsers = users.filter(user => user.status === "Active").length;
  const pendingApprovals = users.filter(user => user.status === "Pending").length;

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
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="p-6 bg-white">
              <div className="flex justify-between items-center mb-4">
                <UsersRound className="text-[#008000] w-5 h-5" />
              </div>
              <div className="text-3xl font-bold text-gray-800">{activeUsers}</div>
              <div className="text-sm text-gray-500">Active Employees</div>
            </Card>
            <Card className="p-6 bg-white">
              <div className="flex justify-between items-center mb-4">
                <Clock className="text-[#4BA0F4] w-5 h-5" />
              </div>
              <div className="text-3xl font-bold text-gray-800">{pendingApprovals}</div>
              <div className="text-sm text-gray-500">Pending Approvals</div>
            </Card>
            <Card className="p-6 bg-white">
              <div className="flex justify-between items-center mb-4">
                <UserPlus className="text-[#4BA0F4] w-5 h-5" />
              </div>
              <div className="text-3xl font-bold text-gray-800">{users.length}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </Card>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#4BA0F4]"
              />
            </div>
            <div className="flex gap-4">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-roles">All Roles</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px]">
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
          </div>

          {/* User Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">No users found.</TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell><Checkbox /></TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full mr-2" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                              {user.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.phone || 'No phone'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.status === "Active" ? "bg-green-100 text-green-800" :
                          user.status === "Deactivated" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {user.status}
                        </span>
                      </TableCell>
                      <TableCell>{user.lastActive}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-md hover:bg-gray-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Edit User</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)} />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page}>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
};

export default Users;
