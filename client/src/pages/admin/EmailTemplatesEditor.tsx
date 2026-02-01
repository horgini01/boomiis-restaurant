import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Eye, RotateCcw, Save } from 'lucide-react';

const TEMPLATE_TYPES = [
  { value: 'order_confirmation', label: 'Order Confirmation (Customer)' },
  { value: 'reservation_confirmation', label: 'Reservation Confirmation (Customer)' },
  { value: 'admin_order_notification', label: 'New Order Notification (Admin)' },
  { value: 'order_preparing', label: 'Order Preparing (Customer)' },
  { value: 'order_ready_for_pickup', label: 'Order Ready for Pickup (Customer)' },
  { value: 'order_out_for_delivery', label: 'Order Out for Delivery (Customer)' },
  { value: 'order_completed', label: 'Order Completed (Customer)' },
];

const DEFAULT_TEMPLATES = {
  order_confirmation: {
    subject: '✅ Order Confirmation - #{orderNumber}',
    headerColor: '#d4a574',
    footerText: 'Thank you for your order! We look forward to serving you.',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Thank you for your order! We've received your payment and are preparing your delicious meal.</p>

<h3>Order #{orderNumber}</h3>
<p><strong>Order Type:</strong> {orderType}</p>
<p><strong>Scheduled For:</strong> {scheduledTime}</p>
<p><strong>Delivery Address:</strong> {deliveryAddress}</p>

<h4>Items:</h4>
{itemsList}

<p><strong>Subtotal:</strong> £{subtotal}</p>
<p><strong>Delivery Fee:</strong> £{deliveryFee}</p>
<p class="total"><strong>Total:</strong> £{total}</p>

<p>We'll notify you when your order is ready for delivery.</p>`,
  },
  reservation_confirmation: {
    subject: '📅 Reservation Confirmed - {restaurantName}',
    headerColor: '#d4a574',
    footerText: 'We look forward to welcoming you!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Your reservation has been confirmed!</p>

<h3>Reservation Details</h3>
<p><strong>Date & Time:</strong> {reservationDateTime}</p>
<p><strong>Party Size:</strong> {partySize} guests</p>
<p><strong>Special Requests:</strong> {specialRequests}</p>

<p>If you need to modify or cancel your reservation, please contact us at least 24 hours in advance.</p>`,
  },
  admin_order_notification: {
    subject: '🔔 New Order #{orderNumber} - £{total}',
    headerColor: '#d4a574',
    footerText: 'Boomiis Restaurant Admin Panel',
    bodyHtml: `<div class="alert">
  <strong>Action Required:</strong> A new order has been placed and payment confirmed.
</div>

<h2>Order #{orderNumber}</h2>
<p><strong>Customer:</strong> {customerName}</p>
<p><strong>Email:</strong> {customerEmail}</p>
<p><strong>Phone:</strong> {customerPhone}</p>
<p><strong>Order Type:</strong> {orderType}</p>
<p><strong>Delivery Address:</strong> {deliveryAddress}</p>

<h3>Items:</h3>
{itemsList}

<p><strong>Subtotal:</strong> £{subtotal}</p>
<p><strong>Delivery Fee:</strong> £{deliveryFee}</p>
<p class="total"><strong>Total:</strong> £{total}</p>

<p><strong>Next Steps:</strong></p>
<ol>
  <li>Confirm the order in the admin panel</li>
  <li>Begin preparing the order</li>
  <li>Update order status as it progresses</li>
</ol>`,
  },
  order_preparing: {
    subject: '👨‍🍳 Your Order is Being Prepared - #{orderNumber}',
    headerColor: '#d4a574',
    footerText: 'Thank you for your patience!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Great news! Our chefs are now preparing your order.</p>

<h3>Order #{orderNumber}</h3>
<p><strong>Status:</strong> Preparing</p>
<p><strong>Order Type:</strong> {orderType}</p>
<p><strong>Scheduled For:</strong> {scheduledTime}</p>

<p>We'll notify you as soon as your order is ready!</p>`,
  },
  order_ready_for_pickup: {
    subject: '✅ Your Order is Ready for Pickup - #{orderNumber}',
    headerColor: '#d4a574',
    footerText: 'We look forward to seeing you!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Your order is ready for pickup!</p>

<h3>Order #{orderNumber}</h3>
<p><strong>Status:</strong> Ready for Pickup</p>
<p><strong>Pickup Address:</strong> {restaurantAddress}</p>

<p>Please collect your order at your earliest convenience. If you have any questions, feel free to contact us.</p>`,
  },
  order_out_for_delivery: {
    subject: '🚗 Your Order is Out for Delivery - #{orderNumber}',
    headerColor: '#d4a574',
    footerText: 'Your meal is on its way!',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Your order is now out for delivery and will arrive soon!</p>

<h3>Order #{orderNumber}</h3>
<p><strong>Status:</strong> Out for Delivery</p>
<p><strong>Delivery Address:</strong> {deliveryAddress}</p>
<p><strong>Estimated Arrival:</strong> {estimatedArrival}</p>

<p>Please ensure someone is available to receive the order.</p>`,
  },
  order_completed: {
    subject: '🎉 Order Delivered - #{orderNumber}',
    headerColor: '#d4a574',
    footerText: 'Thank you for choosing us! We hope to serve you again soon.',
    bodyHtml: `<p>Dear {customerName},</p>
<p>Your order has been successfully delivered!</p>

<h3>Order #{orderNumber}</h3>
<p><strong>Status:</strong> Completed</p>
<p><strong>Delivered At:</strong> {deliveredTime}</p>

<p>We hope you enjoyed your meal! If you have any feedback or concerns, please don't hesitate to contact us.</p>

<p>Thank you for your order!</p>`,
  },
};

export default function EmailTemplatesEditor() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('order_confirmation');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [headerColor, setHeaderColor] = useState('#d4a574');
  const [footerText, setFooterText] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const { data: templates, isLoading, refetch } = trpc.admin.getEmailTemplates.useQuery();
  const saveTemplateMutation = trpc.admin.saveEmailTemplate.useMutation({
    onSuccess: () => {
      toast.success('Email template saved successfully');
      setHasChanges(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });

  const sendTestEmailMutation = trpc.admin.sendTestEmail.useMutation({
    onSuccess: () => {
      toast.success(`Test email sent to ${testEmail}`);
      setTestEmail('');
      setIsSendingTest(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to send test email: ${error.message}`);
      setIsSendingTest(false);
    },
  });

  const handleSendTest = () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSendingTest(true);
    sendTestEmailMutation.mutate({
      templateType: selectedTemplate,
      recipientEmail: testEmail,
    });
  };

  // Pre-populate fields on initial load
  useEffect(() => {
    if (!isLoading && !isInitialized) {
      handleTemplateChange(selectedTemplate);
      setIsInitialized(true);
    }
  }, [isLoading, isInitialized, selectedTemplate]);

  // Load template when selection changes
  const handleTemplateChange = (templateType: string) => {
    setSelectedTemplate(templateType);
    const template = templates?.find((t: any) => t.templateType === templateType);
    
    if (template) {
      setSubject(template.subject);
      setBodyHtml(template.bodyHtml);
      setHeaderColor(template.headerColor);
      setFooterText(template.footerText || '');
    } else {
      // Load default template
      const defaultTemplate = DEFAULT_TEMPLATES[templateType as keyof typeof DEFAULT_TEMPLATES];
      setSubject(defaultTemplate.subject);
      setBodyHtml(defaultTemplate.bodyHtml);
      setHeaderColor(defaultTemplate.headerColor);
      setFooterText(defaultTemplate.footerText);
    }
    setHasChanges(false);
  };

  const handleReset = () => {
    const defaultTemplate = DEFAULT_TEMPLATES[selectedTemplate as keyof typeof DEFAULT_TEMPLATES];
    setSubject(defaultTemplate.subject);
    setBodyHtml(defaultTemplate.bodyHtml);
    setHeaderColor(defaultTemplate.headerColor);
    setFooterText(defaultTemplate.footerText);
    setHasChanges(true);
    toast.info('Template reset to default');
  };

  const handleSave = () => {
    saveTemplateMutation.mutate({
      templateType: selectedTemplate,
      subject,
      bodyHtml,
      headerColor,
      footerText,
    });
  };

  const generatePreviewHtml = () => {
    // Replace placeholders with sample data
    let preview = bodyHtml
      .replace(/{customerName}/g, 'John Smith')
      .replace(/{orderNumber}/g, 'BO-PREVIEW-001')
      .replace(/{orderType}/g, 'Delivery')
      .replace(/{scheduledTime}/g, 'Feb 1, 2026 7:00 PM')
      .replace(/{deliveryAddress}/g, '123 High Street, London, SW1A 1AA')
      .replace(/{itemsList}/g, '<ul><li>1x Jollof Rice with Chicken - £12.99</li><li>1x Fried Plantain - £3.99</li></ul>')
      .replace(/{subtotal}/g, '16.98')
      .replace(/{deliveryFee}/g, '3.99')
      .replace(/{total}/g, '20.97')
      .replace(/{restaurantName}/g, 'Boomiis Restaurant')
      .replace(/{reservationDateTime}/g, 'Feb 5, 2026 7:30 PM')
      .replace(/{partySize}/g, '4')
      .replace(/{specialRequests}/g, 'Window seat preferred')
      .replace(/{customerEmail}/g, 'john@example.com')
      .replace(/{customerPhone}/g, '07123456789');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: ${headerColor}; color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9f9f9; padding: 30px 20px; }
            .content h2, .content h3, .content h4 { color: ${headerColor}; }
            .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
            .total { font-size: 1.2em; font-weight: bold; color: ${headerColor}; }
            .footer { background: #333; color: #fff; padding: 20px; text-align: center; font-size: 14px; }
            ul, ol { padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${subject.replace(/{orderNumber}/g, 'BO-PREVIEW-001').replace(/{total}/g, '20.97').replace(/{restaurantName}/g, 'Boomiis Restaurant')}</h1>
            </div>
            <div class="content">
              ${preview}
            </div>
            <div class="footer">
              ${footerText || 'Boomiis Restaurant - Authentic African Cuisine'}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📧 Email Templates Editor</CardTitle>
        <CardDescription>
          Customize email subject lines, body content, colors, and footer text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selector */}
        <div>
          <Label htmlFor="template-type">Template Type</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger id="template-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject Line */}
        <div>
          <Label htmlFor="subject">Subject Line</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Enter email subject line"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Available variables: {'{customerName}'}, {'{orderNumber}'}, {'{total}'}, {'{restaurantName}'}
          </p>
        </div>

        {/* Header Color */}
        <div>
          <Label htmlFor="header-color">Header Color</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="header-color"
              type="color"
              value={headerColor}
              onChange={(e) => {
                setHeaderColor(e.target.value);
                setHasChanges(true);
              }}
              className="w-20 h-10"
            />
            <Input
              value={headerColor}
              onChange={(e) => {
                setHeaderColor(e.target.value);
                setHasChanges(true);
              }}
              placeholder="#d4a574"
              className="flex-1"
            />
          </div>
        </div>

        {/* Body HTML */}
        <div>
          <Label htmlFor="body-html">Email Body (HTML)</Label>
          <Textarea
            id="body-html"
            value={bodyHtml}
            onChange={(e) => {
              setBodyHtml(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Enter email body HTML"
            rows={15}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Available variables: {'{customerName}'}, {'{orderNumber}'}, {'{orderType}'}, {'{scheduledTime}'}, 
            {'{deliveryAddress}'}, {'{itemsList}'}, {'{subtotal}'}, {'{deliveryFee}'}, {'{total}'}, etc.
          </p>
        </div>

        {/* Footer Text */}
        <div>
          <Label htmlFor="footer-text">Footer Text</Label>
          <Textarea
            id="footer-text"
            value={footerText}
            onChange={(e) => {
              setFooterText(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Enter footer text"
            rows={3}
          />
        </div>

        {/* Send Test Email */}
        <div className="border-t pt-6">
          <Label htmlFor="test-email" className="text-base font-semibold">📨 Send Test Email</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Send a test email to your inbox to see how it looks in Gmail, Outlook, and mobile clients
          </p>
          <div className="flex gap-2">
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="flex-1"
            />
            <Button
              onClick={handleSendTest}
              disabled={isSendingTest || !testEmail}
              className="gap-2"
            >
              {isSendingTest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '📧'
              )}
              Send Test
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveTemplateMutation.isPending}
            className="gap-2"
          >
            {saveTemplateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Template
          </Button>
        </div>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            <div className="overflow-auto">
              <iframe
                srcDoc={generatePreviewHtml()}
                className="w-full h-[600px] border rounded"
                title="Email Preview"
              />
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
