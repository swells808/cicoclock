import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { BadgePreview } from "@/components/badge/BadgePreview";
import { BadgeElementConfig } from "@/components/badge/BadgeElementConfig";
import type { Json } from "@/integrations/supabase/types";
import { 
  Save, 
  Download, 
  RotateCcw, 
  User, 
  QrCode, 
  Image as ImageIcon, 
  Type, 
  Palette,
  Layout,
  Settings2,
  Eye
} from "lucide-react";
import html2canvas from "html2canvas";

interface BadgeTemplate {
  id?: string;
  name: string;
  background_url: string | null;
  template_config: BadgeConfig;
  is_active: boolean;
}

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

const defaultConfig: BadgeConfig = {
  width: 324,
  height: 204,
  backgroundColor: "#ffffff",
  orientation: "landscape",
  elements: {
    companyLogo: { visible: true, x: 12, y: 12, width: 60, height: 40 },
    companyName: { visible: true, x: 80, y: 20, width: 150, height: 24, fontSize: 14, fontWeight: "bold", color: "#1f2937", textAlign: "left" },
    employeePhoto: { visible: true, x: 12, y: 60, width: 80, height: 100 },
    employeeName: { visible: true, x: 100, y: 65, width: 140, height: 24, fontSize: 16, fontWeight: "bold", color: "#1f2937", textAlign: "left" },
    employeeId: { visible: true, x: 100, y: 92, width: 140, height: 20, fontSize: 12, fontWeight: "normal", color: "#6b7280", textAlign: "left" },
    department: { visible: true, x: 100, y: 115, width: 140, height: 20, fontSize: 12, fontWeight: "normal", color: "#6b7280", textAlign: "left" },
    qrCode: { visible: true, x: 248, y: 60, width: 64, height: 64 },
  },
};

const sampleEmployee = {
  name: "John Smith",
  employeeId: "EMP-001",
  department: "Engineering",
  avatarUrl: null,
};

export default function BadgeDesigner() {
  const { company } = useCompany();
  const [template, setTemplate] = useState<BadgeTemplate>({
    name: "Default Badge",
    background_url: null,
    template_config: defaultConfig,
    is_active: true,
  });
  const [selectedElement, setSelectedElement] = useState<keyof BadgeConfig["elements"] | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (company?.id) {
      loadTemplate();
    }
  }, [company?.id]);

  const loadTemplate = async () => {
    if (!company?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("badge_templates")
        .select("*")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .single();

      if (data && !error) {
        setTemplate({
          id: data.id,
          name: data.name,
          background_url: data.background_url,
          template_config: data.template_config as unknown as BadgeConfig,
          is_active: data.is_active,
        });
      }
    } catch (error) {
      console.error("Error loading template:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (updates: Partial<BadgeConfig>) => {
    setTemplate((prev) => ({
      ...prev,
      template_config: { ...prev.template_config, ...updates },
    }));
  };

  const updateElement = (elementKey: keyof BadgeConfig["elements"], updates: Partial<ElementConfig>) => {
    setTemplate((prev) => ({
      ...prev,
      template_config: {
        ...prev.template_config,
        elements: {
          ...prev.template_config.elements,
          [elementKey]: { ...prev.template_config.elements[elementKey], ...updates },
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!company?.id) {
      toast.error("No company selected");
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        company_id: company.id,
        name: template.name,
        background_url: template.background_url,
        template_config: JSON.parse(JSON.stringify(template.template_config)) as Json,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (template.id) {
        const { error } = await supabase
          .from("badge_templates")
          .update(templateData)
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("badge_templates")
          .insert([templateData]);
        if (error) throw error;
      }

      toast.success("Badge template saved successfully");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!badgeRef.current) return;

    try {
      const canvas = await html2canvas(badgeRef.current, {
        scale: 2,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = "badge-preview.png";
      link.href = canvas.toDataURL();
      link.click();
      toast.success("Badge exported successfully");
    } catch (error) {
      toast.error("Failed to export badge");
    }
  };

  const handleReset = () => {
    setTemplate((prev) => ({
      ...prev,
      template_config: defaultConfig,
    }));
    toast.info("Template reset to defaults");
  };

  const config = template.template_config;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Badge Designer</h1>
            <p className="text-muted-foreground">Create and customize employee badge templates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Badge Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-8 bg-muted/50 rounded-lg min-h-[400px]">
              <BadgePreview
                ref={badgeRef}
                config={config}
                companyName={company?.company_name || "Company Name"}
                companyLogo={company?.company_logo_url}
                employee={sampleEmployee}
                selectedElement={selectedElement}
                onElementClick={setSelectedElement}
              />
            </CardContent>
          </Card>

          {/* Settings Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Badge Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="layout" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="layout">
                    <Layout className="h-4 w-4 mr-2" />
                    Layout
                  </TabsTrigger>
                  <TabsTrigger value="elements">
                    <Type className="h-4 w-4 mr-2" />
                    Elements
                  </TabsTrigger>
                  <TabsTrigger value="style">
                    <Palette className="h-4 w-4 mr-2" />
                    Style
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="layout" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={template.name}
                      onChange={(e) => setTemplate((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Badge template name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Orientation</Label>
                    <Select
                      value={config.orientation}
                      onValueChange={(value: "portrait" | "landscape") => {
                        const isPortrait = value === "portrait";
                        updateConfig({
                          orientation: value,
                          width: isPortrait ? 204 : 324,
                          height: isPortrait ? 324 : 204,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landscape">Landscape (3.4" x 2.1")</SelectItem>
                        <SelectItem value="portrait">Portrait (2.1" x 3.4")</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Width (px)</Label>
                      <Input
                        type="number"
                        value={config.width}
                        onChange={(e) => updateConfig({ width: parseInt(e.target.value) || 324 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (px)</Label>
                      <Input
                        type="number"
                        value={config.height}
                        onChange={(e) => updateConfig({ height: parseInt(e.target.value) || 204 })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="elements" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {Object.entries(config.elements).map(([key, element]) => (
                      <div
                        key={key}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedElement === key ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
                        }`}
                        onClick={() => setSelectedElement(key as keyof BadgeConfig["elements"])}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {key === "companyLogo" && <ImageIcon className="h-4 w-4" />}
                            {key === "employeePhoto" && <User className="h-4 w-4" />}
                            {key === "qrCode" && <QrCode className="h-4 w-4" />}
                            {["employeeName", "employeeId", "department", "companyName"].includes(key) && (
                              <Type className="h-4 w-4" />
                            )}
                            <span className="font-medium capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                          </div>
                          <Switch
                            checked={element.visible}
                            onCheckedChange={(checked) =>
                              updateElement(key as keyof BadgeConfig["elements"], { visible: checked })
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedElement && (
                    <BadgeElementConfig
                      elementKey={selectedElement}
                      config={config.elements[selectedElement]}
                      onChange={(updates) => updateElement(selectedElement, updates)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="style" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={config.backgroundColor}
                        onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={config.backgroundColor}
                        onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Background Image URL</Label>
                    <Input
                      value={template.background_url || ""}
                      onChange={(e) => setTemplate((prev) => ({ ...prev, background_url: e.target.value || null }))}
                      placeholder="https://example.com/background.jpg"
                    />
                  </div>

                  <div className="pt-4">
                    <Label className="text-sm text-muted-foreground">Preset Colors</Label>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {["#ffffff", "#f3f4f6", "#1f2937", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"].map((color) => (
                        <button
                          key={color}
                          className="w-8 h-8 rounded-full border-2 border-border hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => updateConfig({ backgroundColor: color })}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Quick Tips */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Tip: Click on elements in the preview to select them</Badge>
              <Badge variant="secondary">Standard badge size: 3.375" x 2.125" (CR80)</Badge>
              <Badge variant="secondary">QR codes link to employee verification page</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
