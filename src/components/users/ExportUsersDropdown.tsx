import { useState } from 'react';
import { Download, QrCode, IdCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User } from '@/hooks/useUsers';
import { toast } from 'sonner';
import { exportStandaloneQRCodes, exportUserBadges, ReportUser } from '@/utils/reportUtils';

interface ExportUsersDropdownProps {
  users: User[];
  selectedUsers: string[];
}

export const ExportUsersDropdown: React.FC<ExportUsersDropdownProps> = ({
  users,
  selectedUsers,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportToCSV = (usersToExport: User[]) => {
    if (usersToExport.length === 0) {
      toast.error('No users to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Department', 'Role', 'Status', 'Employee ID'];
    const csvContent = [
      headers.join(','),
      ...usersToExport.map(user => [
        `"${user.name}"`,
        `"${user.email}"`,
        `"${user.phone || ''}"`,
        `"${user.department || ''}"`,
        `"${user.role}"`,
        `"${user.status}"`,
        `"${user.employeeId || ''}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success(`Exported ${usersToExport.length} user(s)`);
  };

  const convertToReportUsers = (usersToConvert: User[]): ReportUser[] => {
    return usersToConvert.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      department: user.department,
      phone: user.phone,
      first_name: user.first_name,
      last_name: user.last_name,
      display_name: user.display_name,
      employeeId: user.employeeId,
    }));
  };

  const handleExportSelected = () => {
    const selectedUserData = users.filter(u => selectedUsers.includes(u.id));
    exportToCSV(selectedUserData);
  };

  const handleExportAll = () => {
    exportToCSV(users);
  };

  const handleExportQRCodes = async (usersToExport: User[]) => {
    if (usersToExport.length === 0) {
      toast.error('No users to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const reportUsers = convertToReportUsers(usersToExport);
      await exportStandaloneQRCodes(reportUsers, (progress) => {
        setExportProgress(Math.round(progress));
      });
      toast.success(`Generated ${usersToExport.length} QR code(s) with updated URLs`);
    } catch (error) {
      console.error('Error exporting QR codes:', error);
      toast.error('Failed to export QR codes');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleExportBadges = async (usersToExport: User[]) => {
    if (usersToExport.length === 0) {
      toast.error('No users to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const reportUsers = convertToReportUsers(usersToExport);
      await exportUserBadges(
        reportUsers,
        async (user) => {
          // Create a simple badge element for rendering
          const container = document.createElement('div');
          container.style.cssText = `
            position: fixed; left: -9999px; top: -9999px;
            width: 324px; height: 204px;
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
            border-radius: 12px; padding: 16px;
            font-family: system-ui, -apple-system, sans-serif;
            color: white; display: flex; flex-direction: column;
          `;
          
          container.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
              <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                ${user.avatar 
                  ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;" crossorigin="anonymous" />`
                  : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
                }
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:18px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.name}</div>
                ${user.department ? `<div style="font-size:12px;opacity:0.8;margin-top:2px;">${user.department}</div>` : ''}
                ${user.employeeId ? `<div style="font-size:11px;opacity:0.6;margin-top:2px;">ID: ${user.employeeId}</div>` : ''}
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end;flex:1;">
              <div style="background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">${user.role}</div>
              <div id="qr-container" style="width:72px;height:72px;background:white;border-radius:6px;padding:4px;"></div>
            </div>
          `;
          
          document.body.appendChild(container);
          
          // Generate QR code
          const { getBadgeUrl } = await import('@/utils/badgeUrlUtils');
          const { generateQRCodeDataURL } = await import('@/utils/reportUtils');
          const badgeUrl = getBadgeUrl(user.id);
          const qrDataURL = await generateQRCodeDataURL(badgeUrl);
          
          const qrContainer = container.querySelector('#qr-container');
          if (qrContainer) {
            const qrImg = document.createElement('img');
            qrImg.src = qrDataURL;
            qrImg.style.cssText = 'width:100%;height:100%;';
            qrContainer.appendChild(qrImg);
          }
          
          // Wait for images to load
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return container;
        },
        (progress) => {
          setExportProgress(Math.round(progress));
        }
      );
      toast.success(`Generated ${usersToExport.length} badge(s) with updated URLs`);
    } catch (error) {
      console.error('Error exporting badges:', error);
      toast.error('Failed to export badges');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {exportProgress}%
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {selectedUsers.length > 0 && (
          <>
            <DropdownMenuItem onClick={handleExportSelected}>
              Export Selected CSV ({selectedUsers.length})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportQRCodes(users.filter(u => selectedUsers.includes(u.id)))}>
              <QrCode className="h-4 w-4 mr-2" />
              Regenerate QR Codes ({selectedUsers.length})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportBadges(users.filter(u => selectedUsers.includes(u.id)))}>
              <IdCard className="h-4 w-4 mr-2" />
              Regenerate Badges ({selectedUsers.length})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleExportAll}>
          Export All CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportQRCodes(users)}>
          <QrCode className="h-4 w-4 mr-2" />
          Regenerate All QR Codes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportBadges(users)}>
          <IdCard className="h-4 w-4 mr-2" />
          Regenerate All Badges
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
