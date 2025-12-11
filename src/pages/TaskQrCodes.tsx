import React, { useRef } from "react";
import { Download, Printer, QrCode, AlertCircle } from "lucide-react";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/contexts/CompanyContext";
import { useTaskTypes } from "@/hooks/useTaskTypes";
import QRCode from "qrcode";

const TaskQrCodes: React.FC = () => {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { company } = useCompany();
  const { taskTypes, loading: taskTypesLoading } = useTaskTypes(company?.id);
  const qrRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  // Generate QR codes once task types are loaded
  React.useEffect(() => {
    if (taskTypes.length > 0 && company?.id) {
      taskTypes.forEach((taskType) => {
        const canvas = qrRefs.current[taskType.id];
        if (canvas) {
          const qrData = JSON.stringify({
            companyId: company.id,
            taskTypeId: taskType.id,
            taskTypeCode: taskType.code,
            taskTypeName: taskType.name,
          });
          QRCode.toCanvas(canvas, qrData, {
            width: 200,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });
        }
      });
    }
  }, [taskTypes, company?.id]);

  const handleDownload = (taskType: { id: string; name: string; code: string }) => {
    const canvas = qrRefs.current[taskType.id];
    if (canvas) {
      const link = document.createElement("a");
      link.download = `qr-${taskType.code}-${taskType.name.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  const handlePrint = (taskType: { id: string; name: string; code: string }) => {
    const canvas = qrRefs.current[taskType.id];
    if (canvas) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${taskType.name}</title>
              <style>
                body {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  font-family: system-ui, -apple-system, sans-serif;
                }
                h1 { font-size: 24px; margin-bottom: 8px; }
                p { font-size: 14px; color: #666; margin-bottom: 24px; }
                img { width: 300px; height: 300px; }
              </style>
            </head>
            <body>
              <h1>${taskType.name}</h1>
              <p>Code: ${taskType.code}</p>
              <img src="${canvas.toDataURL("image/png")}" alt="QR Code" />
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <StandardHeader />
        <main className="pt-20 pb-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <StandardHeader />
        <main className="pt-20 pb-20">
          <div className="container mx-auto py-8 px-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                You must be an administrator to access this page.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StandardHeader />
      <main className="pt-20 pb-20">
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <QrCode className="h-6 w-6" />
              Task QR Codes
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate and download QR codes for task check-in/check-out
            </p>
          </div>

          {/* QR Codes Grid */}
          {taskTypesLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : taskTypes.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Task Types Found</p>
                  <p className="text-sm mt-1">
                    Create task types in Settings to generate QR codes.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {taskTypes.map((taskType) => (
                <Card key={taskType.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{taskType.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Code: {taskType.code}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-lg mb-4">
                      <canvas
                        ref={(el) => {
                          qrRefs.current[taskType.id] = el;
                        }}
                        width={200}
                        height={200}
                      />
                    </div>
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(taskType)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePrint(taskType)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TaskQrCodes;
