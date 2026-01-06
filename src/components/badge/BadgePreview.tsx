import { forwardRef, useEffect, useState } from "react";
import QRCode from "qrcode";
import { User } from "lucide-react";
import { getBadgeUrl } from "@/utils/badgeUrlUtils";

interface BadgeConfig {
  width: number;
  height: number;
  backgroundColor: string;
  orientation: "portrait" | "landscape";
  elements: {
    companyLogo: ElementConfig;
    employeePhoto: ElementConfig;
    employeeName: ElementConfig;
    employeeId: ElementConfig;
    department: ElementConfig;
    qrCode: ElementConfig;
    companyName: ElementConfig;
  };
}

interface ElementConfig {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
}

interface Employee {
  name: string;
  employeeId: string;
  department: string;
  avatarUrl: string | null;
}

interface BadgePreviewProps {
  config: BadgeConfig;
  companyName: string;
  companyLogo: string | null | undefined;
  employee: Employee;
  selectedElement: keyof BadgeConfig["elements"] | null;
  onElementClick: (element: keyof BadgeConfig["elements"]) => void;
}

export const BadgePreview = forwardRef<HTMLDivElement, BadgePreviewProps>(
  ({ config, companyName, companyLogo, employee, selectedElement, onElementClick }, ref) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>("");

    useEffect(() => {
      const generateQR = async () => {
        try {
          const badgeUrl = getBadgeUrl("sample-id");
          const dataUrl = await QRCode.toDataURL(badgeUrl, {
            width: config.elements.qrCode.width * 2,
            margin: 1,
            color: { dark: "#000000", light: "#ffffff" },
          });
          setQrDataUrl(dataUrl);
        } catch (error) {
          console.error("Error generating QR code:", error);
        }
      };
      generateQR();
    }, [config.elements.qrCode.width]);

    const getElementStyle = (element: ElementConfig, isSelected: boolean): React.CSSProperties => ({
      position: "absolute",
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      display: element.visible ? "flex" : "none",
      alignItems: "center",
      justifyContent: element.textAlign === "center" ? "center" : element.textAlign === "right" ? "flex-end" : "flex-start",
      fontSize: element.fontSize,
      fontWeight: element.fontWeight as any,
      color: element.color,
      outline: isSelected ? "2px solid hsl(var(--primary))" : "none",
      outlineOffset: "2px",
      cursor: "pointer",
      borderRadius: "2px",
      overflow: "hidden",
    });

    const elements = config.elements;

    return (
      <div
        ref={ref}
        className="relative shadow-xl rounded-lg overflow-hidden"
        style={{
          width: config.width,
          height: config.height,
          backgroundColor: config.backgroundColor,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Company Logo */}
        <div
          style={getElementStyle(elements.companyLogo, selectedElement === "companyLogo")}
          onClick={() => onElementClick("companyLogo")}
        >
          {companyLogo ? (
            <img
              src={companyLogo}
              alt="Company Logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center rounded text-xs text-muted-foreground">
              Logo
            </div>
          )}
        </div>

        {/* Company Name */}
        <div
          style={getElementStyle(elements.companyName, selectedElement === "companyName")}
          onClick={() => onElementClick("companyName")}
        >
          <span className="truncate">{companyName}</span>
        </div>

        {/* Employee Photo */}
        <div
          style={getElementStyle(elements.employeePhoto, selectedElement === "employeePhoto")}
          onClick={() => onElementClick("employeePhoto")}
        >
          {employee.avatarUrl ? (
            <img
              src={employee.avatarUrl}
              alt={employee.name}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center rounded">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Employee Name */}
        <div
          style={getElementStyle(elements.employeeName, selectedElement === "employeeName")}
          onClick={() => onElementClick("employeeName")}
        >
          <span className="truncate">{employee.name}</span>
        </div>

        {/* Employee ID */}
        <div
          style={getElementStyle(elements.employeeId, selectedElement === "employeeId")}
          onClick={() => onElementClick("employeeId")}
        >
          <span className="truncate">{employee.employeeId}</span>
        </div>

        {/* Department */}
        <div
          style={getElementStyle(elements.department, selectedElement === "department")}
          onClick={() => onElementClick("department")}
        >
          <span className="truncate">{employee.department}</span>
        </div>

        {/* QR Code */}
        <div
          style={getElementStyle(elements.qrCode, selectedElement === "qrCode")}
          onClick={() => onElementClick("qrCode")}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center rounded">
              <span className="text-xs text-muted-foreground">QR</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

BadgePreview.displayName = "BadgePreview";
