import React from "react";
import { Card } from "@/components/ui/card";
import { UsersRound, Clock, UserPlus } from "lucide-react";

interface UserStatsProps {
  activeUsers: number;
  pendingApprovals: number;
  newUsers: number;
  activeUsersChange?: number;
}

export const UserStats: React.FC<UserStatsProps> = ({
  activeUsers,
  pendingApprovals,
  newUsers,
  activeUsersChange = 0
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card className="p-6 bg-white">
        <div className="flex justify-between items-center mb-4">
          <UsersRound className="text-[#008000] w-5 h-5" />
        </div>
        <div className="text-3xl font-bold text-gray-800">{activeUsers}</div>
        <div className="text-sm text-gray-500">Active Employees</div>
        <div className="text-xs text-green-600 mt-1">
          {activeUsersChange > 0 ? `+${activeUsersChange} total` : 'No change this month'}
        </div>
      </Card>

      <Card className="p-6 bg-white">
        <div className="flex justify-between items-center mb-4">
          <Clock className="text-[#4BA0F4] w-5 h-5" />
          <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">{pendingApprovals} pending</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">{pendingApprovals}</div>
        <div className="text-sm text-gray-500">Pending Approvals</div>
        <div className="text-xs text-gray-500 mt-1">Role changes waiting</div>
      </Card>

      <Card className="p-6 bg-white">
        <div className="flex justify-between items-center mb-4">
          <UserPlus className="text-[#4BA0F4] w-5 h-5" />
        </div>
        <div className="text-3xl font-bold text-gray-800">{newUsers}</div>
        <div className="text-sm text-gray-500">New This Month</div>
        <div className="text-xs text-gray-500 mt-1">Recently added employees</div>
      </Card>
    </div>
  );
};
