import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Mail, Send, Trash2, Plus, Eye, BookTemplate } from 'lucide-react';
import { EmailTemplateLibrary } from '@/components/EmailTemplateLibrary';
import type { EmailTemplate } from '@/lib/emailTemplates';

export default function EmailCampaigns() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);
  const [formData, setFormData] = useState({
    campaignName: '',
    subject: '',
    bodyHtml: '',
  });

  const { data: campaigns = [], isLoading, refetch } = trpc.campaigns.getAll.useQuery();
  const { data: subscribers = [] } = trpc.subscribers.getAll.useQuery();
  const { data: settings } = trpc.settings.getPublic.useQuery();
  
  const handleSelectTemplate = (template: EmailTemplate) => {
    setFormData({
      campaignName: template.name,
      subject: template.defaultSubject,
      bodyHtml: template.bodyHtml,
    });
    toast.success(`Template "${template.name}" loaded. Customize and save when ready.`);
  };

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      toast.success('Campaign created successfully');
      setIsCreateDialogOpen(false);
      setFormData({ campaignName: '', subject: '', bodyHtml: '' });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create campaign');
    },
  });

  const sendMutation = trpc.campaigns.send.useMutation({
    onSuccess: (data) => {
      toast.success(`Campaign sent to ${data.sentCount} subscribers`);
      if (data.failedCount > 0) {
        toast.warning(`${data.failedCount} emails failed to send`);
      }
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send campaign');
    },
  });

  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      toast.success('Campaign deleted successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete campaign');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSend = (campaignId: number, campaignName: string) => {
    const activeSubscribers = subscribers.filter(sub => sub.isActive);
    if (activeSubscribers.length === 0) {
      toast.error('No active subscribers found');
      return;
    }

    if (confirm(`Send "${campaignName}" to ${activeSubscribers.length} active subscribers?`)) {
      sendMutation.mutate({ campaignId });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePreview = (bodyHtml: string) => {
    // Fetch restaurant settings for accurate preview
    const restaurantName = settings?.restaurant_name || 'Boomiis Restaurant';
    const restaurantLogo = settings?.restaurant_logo || '';
    const contactEmail = settings?.contact_email || 'hello@boomiis.uk';
    
    // Wrap the content in the same template used for actual emails
    const wrappedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #d4a574; color: white; padding: 30px 20px; text-align: center; }
            .header img { max-height: 60px; margin-bottom: 15px; }
            .content { background: #f9f9f9; padding: 30px 20px; }
            .footer { background: #333; color: #fff; padding: 20px; text-align: center; font-size: 14px; }
            .unsubscribe { color: #999; font-size: 12px; margin-top: 15px; }
            .unsubscribe a { color: #d4a574; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${restaurantLogo ? `<img src="${window.location.origin}${restaurantLogo}" alt="${restaurantName}" />` : `<h1 style="margin: 0; font-size: 24px;">${restaurantName}</h1>`}
            </div>
            <div class="content">
              ${bodyHtml}
            </div>
            <div class="footer">
              <p><strong>${restaurantName}</strong></p>
              <p>Authentic West African Cuisine</p>
              <p>✉️ ${contactEmail}</p>
              <div class="unsubscribe">
                <p>You're receiving this email because you subscribed to our newsletter.</p>
                <p>If you no longer wish to receive these emails, you can <a href="#">unsubscribe here</a>.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    setPreviewHtml(wrappedHtml);
    setIsPreviewOpen(true);
  };

  const activeSubscribersCount = subscribers.filter(sub => sub.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Campaigns</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTemplateLibraryOpen(true)}
                >
                  <BookTemplate className="h-4 w-4 mr-2" />
                  Choose from Template Library
                </Button>
              </div>
              <div>
                <Label htmlFor="campaignName">Campaign Name *</Label>
                <Input
                  id="campaignName"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  placeholder="e.g., Summer Special Offer"
                  required
                />
              </div>

              <div>
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., 🌞 Summer Special: 20% Off All Orders!"
                  required
                />
              </div>

              <div>
                <Label htmlFor="bodyHtml">Email Content (HTML) *</Label>
                <Textarea
                  id="bodyHtml"
                  value={formData.bodyHtml}
                  onChange={(e) => setFormData({ ...formData, bodyHtml: e.target.value })}
                  placeholder="Enter your email HTML content here..."
                  rows={15}
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Use HTML for formatting. The content will be wrapped in our branded email template automatically.
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Example HTML Content:</h4>
                <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`<h2 style="color: #d4a574;">Summer Special Offer! 🌞</h2>
<p>Dear Valued Customer,</p>
<p>Beat the heat with our <strong>20% discount</strong> on all orders this summer!</p>
<ul>
  <li>Fresh Jollof Rice</li>
  <li>Grilled Suya Skewers</li>
  <li>Refreshing Zobo Drink</li>
</ul>
<p style="text-align: center; margin: 30px 0;">
  <a href="https://yoursite.com/menu" style="background: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Order Now</a>
</p>
<p>Offer valid until August 31st. Use code: <strong>SUMMER20</strong></p>`}
                </pre>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => handlePreview(formData.bodyHtml)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Campaign'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeSubscribersCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{campaigns.filter(c => c.status === 'sent').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="pt-6">
          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No campaigns yet</p>
              <p className="text-sm">Create your first email campaign to reach your subscribers</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                      <TableCell className="max-w-xs truncate">{campaign.subject}</TableCell>
                      <TableCell>
                        {campaign.status === 'draft' && <Badge variant="secondary">Draft</Badge>}
                        {campaign.status === 'sending' && <Badge variant="default" className="bg-blue-600">Sending</Badge>}
                        {campaign.status === 'sent' && <Badge variant="default" className="bg-green-600">Sent</Badge>}
                        {campaign.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                      </TableCell>
                      <TableCell>{campaign.recipientCount || 0}</TableCell>
                      <TableCell>
                        {campaign.sentCount > 0 ? (
                          <span className="text-green-600 font-medium">{campaign.sentCount}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(campaign.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {campaign.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleSend(campaign.id, campaign.campaignName)}
                              disabled={sendMutation.isPending || activeSubscribersCount === 0}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          )}
                          {campaign.status === 'sent' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSend(campaign.id, campaign.campaignName)}
                              disabled={sendMutation.isPending || activeSubscribersCount === 0}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreview(campaign.bodyHtml)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(campaign.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[70vh]"
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>

      {/* Template Library Modal */}
      <EmailTemplateLibrary
        open={isTemplateLibraryOpen}
        onClose={() => setIsTemplateLibraryOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </AdminLayout>
    </>
  );
}
