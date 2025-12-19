import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useTimeOffRequests, TIME_OFF_TYPES } from "@/hooks/useTimeOffRequests";
import { useUserRole } from "@/hooks/useUserRole";

interface TimeOffTabProps {
  profileId: string;
}

export const TimeOffTab = ({ profileId }: TimeOffTabProps) => {
  const { requests, loading, updateRequestStatus, isUpdating } = useTimeOffRequests(profileId);
  const { isAdmin, isSupervisor } = useUserRole();
  const canApprove = isAdmin || isSupervisor;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "denied":
        return <Badge variant="destructive">Denied</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const getTypeLabel = (type: string) => TIME_OFF_TYPES.find(t => t.value === type)?.label || type;

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          No time off requests found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              {canApprove && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{getTypeLabel(request.type)}</TableCell>
                <TableCell>
                  {format(new Date(request.start_date), "MMM d")} - {format(new Date(request.end_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell>{request.hours_requested || "—"}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                {canApprove && (
                  <TableCell>
                    {request.status === "pending" && (
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => updateRequestStatus({ id: request.id, status: "approved" })}
                          disabled={isUpdating}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => updateRequestStatus({ id: request.id, status: "denied" })}
                          disabled={isUpdating}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
