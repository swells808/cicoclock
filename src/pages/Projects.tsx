import React, { useState } from "react";
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
  Eye,
  Upload
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
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { useProjects, useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { ProjectCSVImportModal } from "@/components/projects/ProjectCSVImportModal";

const Projects = () => {
  const { data: projects = [], isLoading, error, refetch } = useProjects();
  const createProject = useCreateProject();
  
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"name" | "created_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectNumber, setNewProjectNumber] = useState("");
  const [newProjectAddress, setNewProjectAddress] = useState("");
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [editProjectNumber, setEditProjectNumber] = useState("");
  const [editProjectAddress, setEditProjectAddress] = useState("");
  const navigate = useNavigate();

  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();

  const handleSort = (field: "name" | "created_at") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    createProject.mutate(
      {
        name: newProjectName,
        description: newProjectDescription,
        project_number: newProjectNumber || undefined,
        address: newProjectAddress || undefined,
      },
      {
        onSuccess: () => {
          setShowNewProjectDialog(false);
          setNewProjectName("");
          setNewProjectDescription("");
          setNewProjectNumber("");
          setNewProjectAddress("");
        }
      }
    );
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || "");
    setEditProjectNumber(project.project_number || "");
    setEditProjectAddress(project.address || "");
  };

  const handleSaveProject = () => {
    if (!editingProject || !editProjectName.trim()) return;
    
    updateProject(
      { 
        id: editingProject.id, 
        name: editProjectName, 
        description: editProjectDescription,
        project_number: editProjectNumber || undefined,
        address: editProjectAddress || undefined,
      },
      {
        onSuccess: () => {
          setEditingProject(null);
          setEditProjectName("");
          setEditProjectDescription("");
          setEditProjectNumber("");
          setEditProjectAddress("");
        }
      }
    );
  };

  const handleViewDetails = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      handleEditProject(project);
    }
  };

  const filteredProjects = projects
    .filter(project =>
      (statusFilter === "all" || (project.is_active ? "Active" : "Inactive") === statusFilter) &&
      (project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (project.project_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
       (project.address || "").toLowerCase().includes(searchQuery.toLowerCase()))
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-10">Loading jobs...</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-10 text-destructive">Error: {error.message}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Overview */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Active Jobs</h3>
              <span className="text-2xl font-bold text-green-600">
                {projects.filter(p => p.is_active).length}
              </span>
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Total Jobs</h3>
              <span className="text-2xl font-bold text-primary">{projects.length}</span>
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Inactive Jobs</h3>
              <span className="text-2xl font-bold text-orange-500">
                {projects.filter(p => !p.is_active).length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <h2 className="text-xl font-semibold">Jobs / Projects</h2>
            <div className="flex flex-col lg:flex-row gap-4">
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
                  placeholder="Search jobs..."
                  className="w-full lg:w-64 pl-10"
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
              <Button variant="outline" onClick={() => setIsCSVImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowNewProjectDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Job
              </Button>
            </div>
          </div>

          {/* List View */}
          {viewMode === "list" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 cursor-pointer group" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">
                        Job Name
                        {sortField === "name" && (sortOrder === "asc" ? <ArrowUpZA className="h-4 w-4 text-gray-500" /> : <ArrowDownAZ className="h-4 w-4 text-gray-500" />)}
                      </div>
                    </th>
                    <th className="text-left py-4 px-4">Job #</th>
                    <th className="text-left py-4 px-4">Address</th>
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
                    <tr key={project.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${project.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          {project.name}
                        </div>
                      </td>
                      <td className="py-4 px-4">{project.project_number || '—'}</td>
                      <td className="py-4 px-4 max-w-[200px] truncate">{project.address || '—'}</td>
                      <td className="py-4 px-4">{project.clients?.company_name || 'N/A'}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${project.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {project.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-4">{project.estimated_hours ? `${project.estimated_hours} hrs` : '0 hrs'}</td>
                      <td className="py-4 px-4">{new Date(project.created_at).toLocaleDateString()}</td>
                      <td className="py-4 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(project.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditProject(project)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Job
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => updateProject(
                                { id: project.id, is_active: false },
                                { onSuccess: () => refetch() }
                              )}
                            >
                              Archive
                            </DropdownMenuItem>
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
                <div key={project.id} className="border border-border rounded-lg p-5 shadow-sm hover:shadow transition-shadow bg-card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      {project.project_number && (
                        <span className="text-xs text-muted-foreground">#{project.project_number}</span>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${project.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {project.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {project.address && (
                    <p className="text-sm text-muted-foreground mb-2 truncate">{project.address}</p>
                  )}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description || 'No description'}</p>
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-muted-foreground">Client: {project.clients?.company_name || 'N/A'}</span>
                    <span className="text-muted-foreground">Hours: {project.estimated_hours ? `${project.estimated_hours} hrs` : '0 hrs'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Created: {new Date(project.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" size="sm" className="p-0 h-8 w-8" onClick={() => handleEditProject(project)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredProjects.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-4">No jobs found matching your search</p>
              <Button onClick={() => setSearchQuery("")} variant="outline">Clear search</Button>
            </div>
          )}
        </div>
      </section>

      {/* New Job Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
            <DialogDescription>Add a new job/project to track time against</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Job Name</Label>
              <Input
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter job name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-number">Job / Project Number</Label>
              <Input
                id="project-number"
                value={newProjectNumber}
                onChange={(e) => setNewProjectNumber(e.target.value)}
                placeholder="Enter job or project number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newProjectAddress}
                onChange={(e) => setNewProjectAddress(e.target.value)}
                placeholder="Enter job address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Enter job description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || createProject.isPending}>
              {createProject.isPending ? 'Creating...' : 'Create Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update job/project details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Job Name</Label>
              <Input
                id="edit-name"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                placeholder="Enter job name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-number">Job / Project Number</Label>
              <Input
                id="edit-project-number"
                value={editProjectNumber}
                onChange={(e) => setEditProjectNumber(e.target.value)}
                placeholder="Enter job or project number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editProjectAddress}
                onChange={(e) => setEditProjectAddress(e.target.value)}
                placeholder="Enter job address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editProjectDescription}
                onChange={(e) => setEditProjectDescription(e.target.value)}
                placeholder="Enter job description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>Cancel</Button>
            <Button onClick={handleSaveProject} disabled={!editProjectName.trim() || isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectCSVImportModal
        open={isCSVImportOpen}
        onOpenChange={setIsCSVImportOpen}
        onImportComplete={() => refetch()}
      />
    </DashboardLayout>
  );
};

export default Projects;
