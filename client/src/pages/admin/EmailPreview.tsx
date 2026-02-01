import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Eye } from "lucide-react";

const EMAIL_TEMPLATES = [
  { value: 'orderConfirmation', label: 'Order Confirmation (Customer)' },
  { value: 'reservationConfirmation', label: 'Reservation Confirmation (Customer)' },
  { value: 'adminOrderNotification', label: 'New Order Notification (Admin)' }
] as const;

export default function EmailPreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<typeof EMAIL_TEMPLATES[number]['value']>('orderConfirmation');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data, isLoading, refetch } = trpc.admin.getEmailPreviews.useQuery(
    { templateType: selectedTemplate },
    { enabled: isPreviewOpen }
  );

  const handlePreview = () => {
    setIsPreviewOpen(true);
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Preview
        </CardTitle>
        <CardDescription>
          Preview how your email templates will look to customers and admins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Template</label>
            <Select value={selectedTemplate} onValueChange={(value) => setSelectedTemplate(value as typeof selectedTemplate)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATES.map((template) => (
                  <SelectItem key={template.value} value={template.value}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogTrigger asChild>
                <Button onClick={handlePreview} className="w-full sm:w-auto">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Email
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {EMAIL_TEMPLATES.find(t => t.value === selectedTemplate)?.label}
                  </DialogTitle>
                  <DialogDescription>
                    This is a preview with sample data. Actual emails will use real customer information.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : data?.html ? (
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        srcDoc={data.html}
                        className="w-full h-[600px] border-0"
                        title="Email Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No preview available
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
          <strong>Note:</strong> Email previews use sample data. The actual emails sent to customers will contain real order/reservation details.
        </div>
      </CardContent>
    </Card>
  );
}
