import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployeeAssignments, Assignment, ASSIGNMENT_CATEGORIES } from "@/hooks/useEmployeeAssignments";
import { Loader2 } from "lucide-react";

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment | null;
  profileId: string;
}

export const AssignmentDialog = ({ 
  open, 
  onOpenChange, 
  assignment, 
  profileId 
}: AssignmentDialogProps) => {
  const { createAssignment, updateAssignment, isCreating, isUpdating } = useEmployeeAssignments(profileId);
  
  const [formData, setFormData] = useState<{
    category: "tools" | "fleet" | "tech_assets" | "equipment" | "cards";
    name: string;
    description: string;
    serial_number: string;
    assigned_date: string;
    return_date: string;
    status: string;
    notes: string;
  }>({
    category: "tools",
    name: "",
    description: "",
    serial_number: "",
    assigned_date: new Date().toISOString().split("T")[0],
    return_date: "",
    status: "assigned",
    notes: "",
  });

  useEffect(() => {
    if (assignment) {
      setFormData({
        category: assignment.category,
        name: assignment.name,
        description: assignment.description || "",
        serial_number: assignment.serial_number || "",
        assigned_date: assignment.assigned_date || new Date().toISOString().split("T")[0],
        return_date: assignment.return_date || "",
        status: assignment.status,
        notes: assignment.notes || "",
      });
    } else {
      setFormData({
        category: "tools",
        name: "",
        description: "",
        serial_number: "",
        assigned_date: new Date().toISOString().split("T")[0],
        return_date: "",
        status: "assigned",
        notes: "",
      });
    }
  }, [assignment, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      category: formData.category,
      name: formData.name,
      description: formData.description || null,
      serial_number: formData.serial_number || null,
      assigned_date: formData.assigned_date || null,
      return_date: formData.return_date || null,
      status: formData.status,
      notes: formData.notes || null,
    };

    if (assignment) {
      updateAssignment({ id: assignment.id, ...data });
    } else {
      createAssignment(data);
    }
    
    onOpenChange(false);
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{assignment ? "Edit Assignment" : "Add Assignment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., MacBook Pro 16"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial_number">Serial Number</Label>
            <Input
              id="serial_number"
              value={formData.serial_number}
              onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
              placeholder="e.g., SN12345678"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assigned_date">Assigned Date</Label>
              <Input
                id="assigned_date"
                type="date"
                value={formData.assigned_date}
                onChange={(e) => setFormData(prev => ({ ...prev, assigned_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="return_date">Return Date</Label>
              <Input
                id="return_date"
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData(prev => ({ ...prev, return_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {assignment ? "Update" : "Add"} Assignment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
