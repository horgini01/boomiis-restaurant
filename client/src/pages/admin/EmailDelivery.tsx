import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Mail, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_ICONS = {
  sent: <Clock className="h-4 w-4 text-blue-500" />,
  delivered: <CheckCircle className="h-4 w-4 text-green-500" />,
  opened: <Eye className="h-4 w-4 text-purple-500" />,
  clicked: <Mail className="h-4 w-4 text-orange-500" />,
  bounced: <XCircle className="h-4 w-4 text-red-500" />,
  failed: <XCircle className="h-4 w-4 text-red-600" />,
};

const STATUS_LABELS = {
  sent: 'Sent',
  delivered: 'Delivered',
  opened: 'Opened',
  clicked: 'Clicked',
  bounced: 'Bounced',
  failed: 'Failed',
};

const TEMPLATE_LABELS = {
  order_confirmation: 'Order Confirmation',
  reservation_confirmation: 'Reservation Confirmation',
  admin_order_notification: 'Admin Order Notification',
};

export default function EmailDelivery() {
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: emailLogs, isLoading } = trpc.admin.getEmailLogs.useQuery({
    templateType: templateFilter === 'all' ? undefined : templateFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const { data: stats } = trpc.admin.getEmailStats.useQuery();

  if (isLoading) {
    return (
      
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AdminLayout>
      
    );
  }

  return (
    
      <AdminLayout>
        <div>
          <h1 className="text-4xl font-bold mb-8">📧 Email Delivery Tracking</h1>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Sent</CardDescription>
                <CardTitle className="text-3xl">{stats?.totalSent || 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Delivered</CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  {stats?.delivered || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Opened</CardDescription>
                <CardTitle className="text-3xl text-purple-600">
                  {stats?.opened || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Bounced</CardDescription>
                <CardTitle className="text-3xl text-red-600">
                  {stats?.bounced || 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Template Type</label>
                  <Select value={templateFilter} onValueChange={setTemplateFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      <SelectItem value="order_confirmation">Order Confirmation</SelectItem>
                      <SelectItem value="reservation_confirmation">Reservation Confirmation</SelectItem>
                      <SelectItem value="admin_order_notification">Admin Order Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="opened">Opened</SelectItem>
                      <SelectItem value="clicked">Clicked</SelectItem>
                      <SelectItem value="bounced">Bounced</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Email History</CardTitle>
              <CardDescription>
                {emailLogs?.length || 0} emails found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Delivered At</TableHead>
                      <TableHead>Opened At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs && emailLogs.length > 0 ? (
                      emailLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {STATUS_ICONS[log.status as keyof typeof STATUS_ICONS]}
                              <span className="text-sm">
                                {STATUS_LABELS[log.status as keyof typeof STATUS_LABELS]}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {TEMPLATE_LABELS[log.templateType as keyof typeof TEMPLATE_LABELS] || log.templateType}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.recipientName || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{log.recipientEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {format(new Date(log.sentAt), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </TableCell>
                          <TableCell>
                            {log.deliveredAt ? (
                              <span className="text-sm text-green-600">
                                {format(new Date(log.deliveredAt), 'MMM dd, HH:mm')}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.openedAt ? (
                              <span className="text-sm text-purple-600">
                                {format(new Date(log.openedAt), 'MMM dd, HH:mm')}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No emails found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    
  );
}
