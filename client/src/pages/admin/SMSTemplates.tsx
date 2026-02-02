import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, MessageSquare, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SMSTemplates() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    templateName: '',
    message: '',
    isActive: true,
  });

  const { data: templates, isLoading, refetch } = trpc.smsTemplates.list.useQuery();
  const updateMutation = trpc.smsTemplates.update.useMutation({
    onSuccess: () => {
      toast.success('SMS template updated successfully');
      setEditingId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (template: any) => {
    setEditingId(template.id);
    setFormData({
      templateName: template.templateName,
      message: template.message,
      isActive: template.isActive,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      templateName: '',
      message: '',
      isActive: true,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;

    updateMutation.mutate({
      id: editingId,
      ...formData,
    });
  };

  const getTemplateDescription = (templateType: string) => {
    switch (templateType) {
      case 'order_ready':
        return 'Sent when an order is ready for pickup';
      case 'out_for_delivery':
        return 'Sent when an order is out for delivery';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SMS Templates</h1>
        <p className="text-muted-foreground mt-2">
          Customize SMS notification messages sent to customers
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Available template variables:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><code className="bg-muted px-1 rounded">{'{{customerName}}'}</code> - Customer's name</li>
            <li><code className="bg-muted px-1 rounded">{'{{orderNumber}}'}</code> - Order number</li>
            <li><code className="bg-muted px-1 rounded">{'{{estimatedMinutes}}'}</code> - Estimated delivery time in minutes</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    {editingId === template.id ? (
                      <Input
                        value={formData.templateName}
                        onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                        className="max-w-md"
                      />
                    ) : (
                      template.templateName
                    )}
                  </CardTitle>
                  <CardDescription>{getTemplateDescription(template.templateType)}</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${template.id}`}>Active</Label>
                    <Switch
                      id={`active-${template.id}`}
                      checked={editingId === template.id ? formData.isActive : template.isActive}
                      onCheckedChange={(checked) => {
                        if (editingId === template.id) {
                          setFormData({ ...formData, isActive: checked });
                        } else {
                          handleEdit(template);
                          setFormData({ ...formData, isActive: checked });
                        }
                      }}
                      disabled={editingId !== null && editingId !== template.id}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`message-${template.id}`}>Message Template</Label>
                {editingId === template.id ? (
                  <Textarea
                    id={`message-${template.id}`}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    placeholder="Enter SMS message template..."
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap">
                    {template.message}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Character count: {editingId === template.id ? formData.message.length : template.message.length} / 160
                  {(editingId === template.id ? formData.message.length : template.message.length) > 160 && (
                    <span className="text-orange-500 ml-2">
                      (This message will be split into multiple SMS)
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                {editingId === template.id ? (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      size="sm"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleEdit(template)}
                    variant="outline"
                    size="sm"
                    disabled={editingId !== null}
                  >
                    Edit Template
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
