import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { format } from "date-fns";
import { useEmployeeAssignments, Assignment, ASSIGNMENT_CATEGORIES } from "@/hooks/useEmployeeAssignments";
import { AssignmentDialog } from "@/components/employee/AssignmentDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AssignmentsTabProps {
  profileId: string;
}

export const AssignmentsTab = ({ profileId }: AssignmentsTabProps) => {
  const { assignments, loading, deleteAssignment, isDeleting } = useEmployeeAssignments(profileId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const handleOpenDialog = (assignment?: Assignment) => {
    setEditingAssignment(assignment || null);
    setDialogOpen(true);
  };

  const filteredAssignments = selectedCategory === "all" 
    ? assignments 
    : assignments.filter(a => a.category === selectedCategory);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Assigned</Badge>;
      case "returned":
        return <Badge variant="secondary">Returned</Badge>;
      case "lost":
        return <Badge variant="destructive">Lost</Badge>;
      case "damaged":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Damaged</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    return ASSIGNMENT_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading assignments...</div>;
  }

  return (
    <div className="bg-card rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Assigned Items</h3>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {ASSIGNMENT_CATEGORIES.map(cat => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border rounded-lg">
              No assignments found. Add items to track equipment assigned to this employee.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Serial #</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{assignment.name}</div>
                        {assignment.description && (
                          <div className="text-sm text-muted-foreground">{assignment.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(assignment.category)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {assignment.serial_number || "—"}
                    </TableCell>
                    <TableCell>
                      {assignment.assigned_date 
                        ? format(new Date(assignment.assigned_date), "MMM d, yyyy")
                        : "—"
                      }
                    </TableCell>
                    <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(assignment)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{assignment.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteAssignment(assignment.id)}
                                disabled={isDeleting}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <AssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assignment={editingAssignment}
        profileId={profileId}
      />
    </div>
  );
};
