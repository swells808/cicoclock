import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

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

interface BadgeElementConfigProps {
  elementKey: string;
  config: ElementConfig;
  onChange: (updates: Partial<ElementConfig>) => void;
}

const textElements = ["employeeName", "employeeId", "department", "companyName"];

export function BadgeElementConfig({ elementKey, config, onChange }: BadgeElementConfigProps) {
  const isTextElement = textElements.includes(elementKey);
  const displayName = elementKey.replace(/([A-Z])/g, " $1").trim();

  return (
    <div className="mt-4 p-4 border rounded-lg space-y-4 bg-muted/30">
      <h4 className="font-medium capitalize">{displayName} Settings</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">X Position</Label>
          <Input
            type="number"
            value={config.x}
            onChange={(e) => onChange({ x: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Y Position</Label>
          <Input
            type="number"
            value={config.y}
            onChange={(e) => onChange({ y: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Width</Label>
          <Input
            type="number"
            value={config.width}
            onChange={(e) => onChange({ width: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Height</Label>
          <Input
            type="number"
            value={config.height}
            onChange={(e) => onChange({ height: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>
      </div>

      {isTextElement && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Font Size</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[config.fontSize || 14]}
                onValueChange={([value]) => onChange({ fontSize: value })}
                min={8}
                max={32}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-8">{config.fontSize || 14}px</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Font Weight</Label>
              <Select
                value={config.fontWeight || "normal"}
                onValueChange={(value) => onChange({ fontWeight: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="semibold">Semibold</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Text Align</Label>
              <Select
                value={config.textAlign || "left"}
                onValueChange={(value: "left" | "center" | "right") => onChange({ textAlign: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Text Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.color || "#1f2937"}
                onChange={(e) => onChange({ color: e.target.value })}
                className="w-10 h-8 p-1 cursor-pointer"
              />
              <Input
                value={config.color || "#1f2937"}
                onChange={(e) => onChange({ color: e.target.value })}
                className="flex-1 h-8"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
