import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Eye, Trash2, Plus, Settings, Palette, Type, Image } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BadgeTemplateDesignerProps {
  onClose?: () => void;
}

interface TemplateConfig {
  backgroundColor: string;
  textColor: string;
  showPhoto: boolean;
  showQRCode: boolean;
  showCompanyLogo: boolean;
  showName: boolean;
  showTitle: boolean;
  showDepartment: boolean;
  showEmployeeId: boolean;
  layout: 'vertical' | 'horizontal';
  fontSize: 'small' | 'medium' | 'large';
}

const defaultConfig: TemplateConfig = {
  backgroundColor: '#ffffff',
  textColor: '#000000',
  showPhoto: true,
  showQRCode: true,
  showCompanyLogo: true,
  showName: true,
  showTitle: true,
  showDepartment: true,
  showEmployeeId: true,
  layout: 'vertical',
  fontSize: 'medium',
};

export const BadgeTemplateDesigner: React.FC<BadgeTemplateDesignerProps> = ({ onClose }) => {
  const { company } = useCompany();
  const [templateName, setTemplateName] = useState('Default Template');
  const [config, setConfig] = useState<TemplateConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSave = async () => {
    if (!company?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('badge_templates')
        .upsert({
          company_id: company.id,
          name: templateName,
          template_config: config as any,
          is_active: true,
        });

      if (error) throw error;

      toast.success('Template saved successfully');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: keyof TemplateConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Badge Template Designer</CardTitle>
              <CardDescription>Customize your employee badge design</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Settings Panel */}
            <div className="space-y-6">
              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Tabs defaultValue="layout" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="layout">
                    <Settings className="h-4 w-4 mr-2" />
                    Layout
                  </TabsTrigger>
                  <TabsTrigger value="style">
                    <Palette className="h-4 w-4 mr-2" />
                    Style
                  </TabsTrigger>
                  <TabsTrigger value="elements">
                    <Type className="h-4 w-4 mr-2" />
                    Elements
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="layout" className="space-y-4 mt-4">
                  <div>
                    <Label>Layout Orientation</Label>
                    <Select
                      value={config.layout}
                      onValueChange={(value) => updateConfig('layout', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vertical">Vertical</SelectItem>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Font Size</Label>
                    <Select
                      value={config.fontSize}
                      onValueChange={(value) => updateConfig('fontSize', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="style" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="bgColor">Background Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="bgColor"
                        type="color"
                        value={config.backgroundColor}
                        onChange={(e) => updateConfig('backgroundColor', e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={config.backgroundColor}
                        onChange={(e) => updateConfig('backgroundColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="textColor">Text Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="textColor"
                        type="color"
                        value={config.textColor}
                        onChange={(e) => updateConfig('textColor', e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={config.textColor}
                        onChange={(e) => updateConfig('textColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="elements" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Show Photo</Label>
                    <Switch
                      checked={config.showPhoto}
                      onCheckedChange={(checked) => updateConfig('showPhoto', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Show QR Code</Label>
                    <Switch
                      checked={config.showQRCode}
                      onCheckedChange={(checked) => updateConfig('showQRCode', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Show Company Logo</Label>
                    <Switch
                      checked={config.showCompanyLogo}
                      onCheckedChange={(checked) => updateConfig('showCompanyLogo', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Show Name</Label>
                    <Switch
                      checked={config.showName}
                      onCheckedChange={(checked) => updateConfig('showName', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Show Title</Label>
                    <Switch
                      checked={config.showTitle}
                      onCheckedChange={(checked) => updateConfig('showTitle', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Show Department</Label>
                    <Switch
                      checked={config.showDepartment}
                      onCheckedChange={(checked) => updateConfig('showDepartment', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Show Employee ID</Label>
                    <Switch
                      checked={config.showEmployeeId}
                      onCheckedChange={(checked) => updateConfig('showEmployeeId', checked)}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview Panel */}
            <div className="flex items-center justify-center">
              <div
                className={`border-2 border-dashed border-muted rounded-lg p-8 ${
                  config.layout === 'vertical' ? 'w-64 h-96' : 'w-96 h-64'
                }`}
                style={{
                  backgroundColor: config.backgroundColor,
                  color: config.textColor,
                }}
              >
                <div className={`h-full flex flex-col items-center justify-center gap-4 ${
                  config.layout === 'horizontal' ? 'flex-row' : ''
                }`}>
                  {config.showCompanyLogo && (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {config.showPhoto && (
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">Photo</span>
                    </div>
                  )}

                  <div className={`text-center ${config.layout === 'horizontal' ? 'text-left' : ''}`}>
                    {config.showName && (
                      <div className={`font-bold ${
                        config.fontSize === 'small' ? 'text-sm' :
                        config.fontSize === 'large' ? 'text-xl' : 'text-base'
                      }`}>
                        John Doe
                      </div>
                    )}
                    {config.showTitle && (
                      <div className="text-sm opacity-80">Software Engineer</div>
                    )}
                    {config.showDepartment && (
                      <div className="text-xs opacity-60">Engineering</div>
                    )}
                    {config.showEmployeeId && (
                      <Badge variant="secondary" className="mt-2">ID: EMP001</Badge>
                    )}
                  </div>

                  {config.showQRCode && (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">QR</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
