import { useState, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, MessageSquare, Info, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SMSTemplates() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    templateName: '',
    message: '',
    isActive: true,
  });
  const [testPhone, setTestPhone] = useState('');

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

  const sendTestMutation = trpc.smsTemplates.sendTest.useMutation({
    onSuccess: () => {
      toast.success('Test SMS sent successfully!');
      setTestPhone('');
    },
    onError: (error) => {
      toast.error(`Failed to send test SMS: ${error.message}`);
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

  const handleSendTest = async (templateId: number) => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    sendTestMutation.mutate({
      templateId,
      phoneNumber: testPhone,
    });
  };

  const getTemplateDescription = (templateType: string) => {
    switch (templateType) {
      case 'order_confirmed':
        return 'Sent immediately after payment to confirm order receipt';
      case 'order_preparing':
        return 'Sent when the order starts being prepared by the kitchen';
      case 'order_ready':
        return 'Sent when an order is ready for pickup';
      case 'out_for_delivery':
        return 'Sent when an order is out for delivery';
      case 'order_delivered':
        return 'Sent when delivery is completed';
      case 'order_delayed':
        return 'Sent when an order is delayed beyond expected time';
      case 'order_cancelled':
        return 'Sent when an order is cancelled';
      case 'admin_new_order':
        return 'Sent to admin when a new order is placed';
      case 'admin_new_reservation':
        return 'Sent to admin when a customer books a table';
      case 'admin_catering_quote':
        return 'Sent to admin when a customer requests a catering quote';
      default:
        return '';
    }
  };

  // Generate preview with sample data
  const generatePreview = (message: string) => {
    return message
      // Customer order variables
      .replace(/\{\{customerName\}\}/g, 'John Smith')
      .replace(/\{\{orderNumber\}\}/g, 'BO-12345')
      .replace(/\{\{estimatedMinutes\}\}/g, '30')
      // Admin order variables
      .replace(/\{\{total\}\}/g, '45.99')
      .replace(/\{\{orderType\}\}/g, 'delivery')
      // Reservation variables
      .replace(/\{\{partySize\}\}/g, '4')
      .replace(/\{\{date\}\}/g, '15/02/2026')
      .replace(/\{\{time\}\}/g, '19:00')
      // Catering variables
      .replace(/\{\{eventType\}\}/g, 'Wedding Reception')
      .replace(/\{\{guestCount\}\}/g, '50')
      .replace(/\{\{eventDate\}\}/g, '20/03/2026');
  };

  // Calculate SMS segments (160 chars per segment for standard SMS)
  const calculateSegments = (message: string) => {
    if (message.length === 0) return 0;
    if (message.length <= 160) return 1;
    return Math.ceil(message.length / 153); // Multi-part SMS uses 153 chars per segment
  };

  if (isLoading) {
    return (
      
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AdminLayout>
      
    );
  }

  return (
    
      <AdminLayout>
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
              <div className="mt-3 space-y-3">
                <div>
                  <p className="font-semibold text-sm mb-1">Customer Order Templates:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code className="bg-muted px-1 rounded">{'{{customerName}}'}</code> - Customer's name</li>
                    <li><code className="bg-muted px-1 rounded">{'{{orderNumber}}'}</code> - Order number</li>
                    <li><code className="bg-muted px-1 rounded">{'{{estimatedMinutes}}'}</code> - Estimated delivery time in minutes</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">Admin Order Notifications:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code className="bg-muted px-1 rounded">{'{{orderNumber}}'}</code> - Order number</li>
                    <li><code className="bg-muted px-1 rounded">{'{{total}}'}</code> - Order total amount</li>
                    <li><code className="bg-muted px-1 rounded">{'{{orderType}}'}</code> - delivery or pickup</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">Admin Reservation Notifications:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code className="bg-muted px-1 rounded">{'{{customerName}}'}</code> - Customer's name</li>
                    <li><code className="bg-muted px-1 rounded">{'{{partySize}}'}</code> - Number of guests</li>
                    <li><code className="bg-muted px-1 rounded">{'{{date}}'}</code> - Reservation date</li>
                    <li><code className="bg-muted px-1 rounded">{'{{time}}'}</code> - Reservation time</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">Admin Catering Quote Notifications:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code className="bg-muted px-1 rounded">{'{{customerName}}'}</code> - Customer's name</li>
                    <li><code className="bg-muted px-1 rounded">{'{{eventType}}'}</code> - Type of event</li>
                    <li><code className="bg-muted px-1 rounded">{'{{guestCount}}'}</code> - Number of guests</li>
                    <li><code className="bg-muted px-1 rounded">{'{{eventDate}}'}</code> - Event date</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid gap-6">
            {templates?.map((template) => {
              const currentMessage = editingId === template.id ? formData.message : template.message;
              const segments = calculateSegments(currentMessage);
              const previewText = generatePreview(currentMessage);

              return (
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
                  <CardContent>
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* Editor Section */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`message-${template.id}`}>Message Template</Label>
                          {editingId === template.id ? (
                            <Textarea
                              id={`message-${template.id}`}
                              value={formData.message}
                              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                              rows={6}
                              placeholder="Enter SMS message template..."
                              className="font-mono text-sm"
                            />
                          ) : (
                            <div className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap min-h-[150px]">
                              {template.message}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              Character count: <strong>{currentMessage.length}</strong> / 160
                            </span>
                            <span>
                              SMS segments: <strong>{segments}</strong>
                              {segments > 1 && (
                                <span className="text-orange-500 ml-2">
                                  (Multi-part message)
                                </span>
                              )}
                            </span>
                          </div>
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
                      </div>

                      {/* Send Test SMS Section */}
                      {editingId !== template.id && (
                        <div className="space-y-2 pb-4 border-b">
                          <Label className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Send Test SMS
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter phone number (e.g., +447911123456)"
                              value={testPhone}
                              onChange={(e) => setTestPhone(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              onClick={() => handleSendTest(template.id)}
                              disabled={sendTestMutation.isPending || !testPhone}
                              size="sm"
                              variant="outline"
                            >
                              {sendTestMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                'Send Test'
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Test the template by sending an SMS to your phone with sample data
                          </p>
                        </div>
                      )}

                      {/* Mobile Preview Section */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Mobile Preview
                        </Label>
                        <div className="relative">
                          {/* iPhone-style mockup */}
                          <div className="mx-auto w-[300px] h-[500px] bg-black rounded-[40px] p-3 shadow-2xl">
                            {/* Screen */}
                            <div className="w-full h-full bg-white rounded-[32px] overflow-hidden flex flex-col">
                              {/* Status bar */}
                              <div className="h-8 bg-gray-50 flex items-center justify-between px-6 text-xs">
                                <span className="font-semibold">9:41</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-4 h-3 border border-black rounded-sm relative">
                                    <div className="absolute inset-0.5 bg-black rounded-sm"></div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Message header */}
                              <div className="bg-gray-50 border-b px-4 py-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    B
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm">Boomiis Restaurant</div>
                                    <div className="text-xs text-gray-500">SMS</div>
                                  </div>
                                </div>
                              </div>

                              {/* Message content */}
                              <div className="flex-1 p-4 overflow-auto bg-white">
                                <div className="flex justify-start">
                                  <div className="max-w-[85%] bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                                      {previewText || 'Your message preview will appear here...'}
                                    </p>
                                    <div className="text-xs text-gray-400 mt-1">
                                      Just now
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Preview info */}
                          <div className="mt-4 text-xs text-center text-muted-foreground">
                            Preview shows how your SMS will appear on mobile devices
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </AdminLayout>
    
  );
}
