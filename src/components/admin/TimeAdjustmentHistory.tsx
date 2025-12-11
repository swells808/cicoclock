import React from "react";
import { format } from "date-fns";
import { History, Clock, ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TimeAdjustment {
  id: string;
  admin_user_id: string;
  affected_user_id: string;
  time_entry_id: string;
  old_end_time: string | null;
  new_end_time: string;
  action_type: string;
  reason: string | null;
  timestamp: string;
  admin_profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  affected_profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  time_entries?: {
    id: string;
    start_time: string;
  };
}

interface TimeAdjustmentHistoryProps {
  adjustments: TimeAdjustment[];
  isLoading: boolean;
}

export const TimeAdjustmentHistory: React.FC<TimeAdjustmentHistoryProps> = ({
  adjustments,
  isLoading,
}) => {
  const getDisplayName = (profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  }) => {
    if (!profile) return "Unknown User";
    if (profile.display_name) return profile.display_name;
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return "Unknown User";
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case "retroactive_clockout":
        return <Badge variant="secondary">Retroactive Clock Out</Badge>;
      default:
        return <Badge variant="outline">{actionType}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (adjustments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No Adjustment History</p>
        <p className="text-sm">No time adjustments have been made yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Time Change</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adjustments.map((adjustment) => (
            <TableRow key={adjustment.id}>
              <TableCell>
                <div className="text-foreground">
                  {format(new Date(adjustment.timestamp), "MMM d, yyyy")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(adjustment.timestamp), "h:mm a")}
                </div>
              </TableCell>
              <TableCell className="text-foreground">
                {getDisplayName(adjustment.admin_profile)}
              </TableCell>
              <TableCell className="text-foreground">
                {getDisplayName(adjustment.affected_profile)}
              </TableCell>
              <TableCell>{getActionBadge(adjustment.action_type)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm">
                  <div className="text-muted-foreground">
                    {adjustment.old_end_time ? (
                      <span className="line-through">
                        {format(new Date(adjustment.old_end_time), "MMM d, h:mm a")}
                      </span>
                    ) : (
                      <span className="italic">No end time</span>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="text-foreground font-medium">
                    {format(new Date(adjustment.new_end_time), "MMM d, h:mm a")}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">
                  {adjustment.reason || "-"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
