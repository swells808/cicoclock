import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Clock, Briefcase } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";


interface OpenTimeEntry {
  id: string;
  user_id: string;
  start_time: string;
  project_id: string | null;
  profiles: {
    id: string;
    user_id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  projects: {
    id: string;
    name: string;
  } | null;
}

interface OpenTimeEntriesListProps {
  entries: OpenTimeEntry[];
  isLoading: boolean;
  onClockOut: (entry: OpenTimeEntry) => void;
}

export const OpenTimeEntriesList: React.FC<OpenTimeEntriesListProps> = ({
  entries,
  isLoading,
  onClockOut,
}) => {
  const getDisplayName = (profile: OpenTimeEntry["profiles"]) => {
    if (!profile) return "Unknown User";
    if (profile.display_name) return profile.display_name;
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.email || "Unknown User";
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

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No Open Time Entries</p>
        <p className="text-sm">All employees are currently clocked out.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Clock In Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Project</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={entry.profiles?.avatar_url || undefined} alt={getDisplayName(entry.profiles)} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getDisplayName(entry.profiles).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {getDisplayName(entry.profiles)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {entry.profiles?.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-foreground">
                  {format(new Date(entry.start_time), "MMM d, yyyy")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(entry.start_time), "h:mm a")}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {formatDistanceToNow(new Date(entry.start_time), { addSuffix: false })}
                </Badge>
              </TableCell>
              <TableCell>
                {entry.projects ? (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{entry.projects.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No project</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onClockOut(entry)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Clock Out
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
