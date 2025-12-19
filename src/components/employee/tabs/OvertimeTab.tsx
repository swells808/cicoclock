import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { format } from "date-fns";
import { useOvertimeEntries } from "@/hooks/useOvertimeEntries";
import { useUserRole } from "@/hooks/useUserRole";

interface OvertimeTabProps {
  profileId: string;
}

export const OvertimeTab = ({ profileId }: OvertimeTabProps) => {
  const { entries, loading, updateEntryStatus, isUpdating } = useOvertimeEntries(profileId);
  const { isAdmin, isSupervisor } = useUserRole();
  const canApprove = isAdmin || isSupervisor;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "denied":
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          No overtime entries found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              {canApprove && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                <TableCell className="font-medium">{entry.hours}h</TableCell>
                <TableCell className="max-w-xs truncate">{entry.reason || "—"}</TableCell>
                <TableCell>{getStatusBadge(entry.status)}</TableCell>
                {canApprove && (
                  <TableCell>
                    {entry.status === "pending" && (
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => updateEntryStatus({ id: entry.id, status: "approved" })}
                          disabled={isUpdating}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => updateEntryStatus({ id: entry.id, status: "denied" })}
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
