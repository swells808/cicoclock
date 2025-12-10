import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  MoreHorizontal,
  LayoutGrid,
  List,
  ArrowDownAZ,
  ArrowUpZA,
  Edit,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  client?: { company_name: string };
  total_hours?: number;
}

const Projects = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { company } = useCompany();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"name" | "created_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!company?.id) {
        setProjects([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('projects')
          .select(`*, client:clients(company_name)`)
          .eq('company_id', company.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [company?.id]);

  const handleSort = (field: "name" | "created_at") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleCreateProject = async () => {
    if (!company?.id || !newProjectName.trim()) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          name: newProjectName,
          description: newProjectDescription,
          company_id: company.id,
        });

      if (error) throw error;

      toast.success('Project created successfully');
      setShowNewProjectDialog(false);
      setNewProjectName("");
      setNewProjectDescription("");

      // Refresh projects
      const { data } = await supabase
        .from('projects')
        .select(`*, client:clients(company_name)`)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      setProjects(data || []);
    } catch (err) {
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects
    .filter(project =>
      (statusFilter === "all" || (project.is_active ? "Active" : "Inactive") === statusFilter) &&
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const direction = sortOrder === "asc" ? 1 : -1;
      switch (sortField) {
        case "name":
          return direction * a.name.localeCompare(b.name);
        case "created_at":
          return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StandardHeader />
        <main className="pt-20 pb-20">
          <div className="container mx-auto px-4">
            <div className="text-center py-10">Loading projects...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <StandardHeader />
        <main className="pt-20 pb-20">
          <div className="container mx-auto px-4">
            <div className="text-center py-10 text-red-500">Error: {error}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StandardHeader />

      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4">
          {/* Project Overview */}
          <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Active Projects</h3>
                  <span className="text-2xl font-bold text-[#008000]">
                    {projects.filter(p => p.is_active).length}
                  </span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Total Projects</h3>
                  <span className="text-2xl font-bold text-[#4BA0F4]">{projects.length}</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Inactive Projects</h3>
                  <span className="text-2xl font-bold text-orange-500">
                    {projects.filter(p => !p.is_active).length}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Project List */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <h2 className="text-xl font-semibold mb-4 md:mb-0">Projects</h2>
                <div className="flex flex-col md:flex-row gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                    className="w-10 h-10"
                  >
                    {sortOrder === "asc" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpZA className="h-4 w-4" />}
                  </Button>

                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search projects..."
                      className="w-full md:w-64 pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className={viewMode === "list" ? "bg-gray-100" : ""}
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={viewMode === "grid" ? "bg-gray-100" : ""}
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    className="bg-[#008000] hover:bg-[#006400] text-white"
                    onClick={() => setShowNewProjectDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </div>
              </div>

              {/* List View */}
              {viewMode === "list" && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-4 px-4 cursor-pointer group" onClick={() => handleSort("name")}>
                          <div className="flex items-center gap-1">
                            Project Name
                            {sortField === "name" && (sortOrder === "asc" ? <ArrowUpZA className="h-4 w-4 text-gray-500" /> : <ArrowDownAZ className="h-4 w-4 text-gray-500" />)}
                          </div>
                        </th>
                        <th className="text-left py-4 px-4">Client</th>
                        <th className="text-left py-4 px-4">Status</th>
                        <th className="text-left py-4 px-4">Hours</th>
                        <th className="text-left py-4 px-4 cursor-pointer group" onClick={() => handleSort("created_at")}>
                          <div className="flex items-center gap-1">
                            Created
                            {sortField === "created_at" && (sortOrder === "asc" ? <ArrowUpZA className="h-4 w-4 text-gray-500" /> : <ArrowDownAZ className="h-4 w-4 text-gray-500" />)}
                          </div>
                        </th>
                        <th className="text-left py-4 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((project) => (
                        <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-2 ${project.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                              {project.name}
                            </div>
                          </td>
                          <td className="py-4 px-4">{project.client?.company_name || 'N/A'}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${project.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                              {project.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4 px-4">{project.total_hours ? `${project.total_hours} hrs` : '0 hrs'}</td>
                          <td className="py-4 px-4">{new Date(project.created_at).toLocaleDateString()}</td>
                          <td className="py-4 px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Project
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">Archive</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Grid View */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  {filteredProjects.map((project) => (
                    <div key={project.id} className="border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold">{project.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs ${project.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {project.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description || 'No description'}</p>
                      <div className="flex justify-between text-sm mb-4">
                        <span className="text-gray-600">Client: {project.client?.company_name || 'N/A'}</span>
                        <span className="text-gray-600">Hours: {project.total_hours ? `${project.total_hours} hrs` : '0 hrs'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Created: {new Date(project.created_at).toLocaleDateString()}</span>
                        <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredProjects.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-4">No projects found matching your search</p>
                  <Button onClick={() => setSearchQuery("")} variant="outline">Clear search</Button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* New Project Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Add a new project to track time against</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Enter project description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

export default Projects;
