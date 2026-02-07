import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Download, Mail, MailCheck, MailOpen, MailX, MousePointerClick } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function EmailTracking() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [templateType, setTemplateType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = trpc.analytics.email.analytics.useQuery({
    startDate: dateRange.from,
    endDate: dateRange.to,
    templateType: templateType === 'all' ? undefined : templateType,
  });

  // Fetch logs data
  const { data: logsData, isLoading: logsLoading } = trpc.analytics.email.logs.useQuery({
    page,
    pageSize,
    startDate: dateRange.from,
    endDate: dateRange.to,
    templateType: templateType === 'all' ? undefined : templateType,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      sent: { variant: 'secondary', icon: Mail },
      delivered: { variant: 'default', icon: MailCheck },
      opened: { variant: 'default', icon: MailOpen },
      clicked: { variant: 'default', icon: MousePointerClick },
      bounced: { variant: 'destructive', icon: MailX },
      failed: { variant: 'destructive', icon: MailX },
    };

    const config = variants[status] || variants.sent;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const exportToCSV = () => {
    if (!logsData?.logs) return;

    const headers = ['Date', 'Recipient', 'Template Type', 'Subject', 'Status'];
    const rows = logsData.logs.map(log => [
      format(new Date(log.sentAt), 'yyyy-MM-dd HH:mm:ss'),
      log.recipientEmail,
      log.templateType,
      log.subject,
      log.status,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-tracking-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Delivery Tracking</h1>
        <p className="text-muted-foreground mt-2">
          Monitor email delivery status, open rates, and engagement metrics
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-[280px] justify-start text-left font-normal', !dateRange.from && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Template Type Filter */}
          <Select value={templateType} onValueChange={setTemplateType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Templates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              <SelectItem value="order_confirmed">Order Confirmed</SelectItem>
              <SelectItem value="order_ready">Order Ready</SelectItem>
              <SelectItem value="order_delivered">Order Delivered</SelectItem>
              <SelectItem value="reservation_confirmed">Reservation Confirmed</SelectItem>
              <SelectItem value="review_request">Review Request</SelectItem>
              <SelectItem value="newsletter">Newsletter</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => { setDateRange({ from: undefined, to: undefined }); setTemplateType('all'); }}>
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {analyticsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-20" />
                <div className="h-8 bg-muted rounded w-16 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.totalSent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">All email communications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              <MailCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.deliveryRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.summary.delivered.toLocaleString()} delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
              <MailOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.openRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.summary.opened.toLocaleString()} opened
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
              <MailX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.bounceRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.summary.bounced.toLocaleString()} bounced
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Email Logs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Email Logs</CardTitle>
            <CardDescription>Detailed delivery tracking for all sent emails</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!logsData?.logs?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : logsData?.logs && logsData.logs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.sentAt), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.recipientName || 'Unknown'}</span>
                          <span className="text-sm text-muted-foreground">{log.recipientEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.templateType}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {logsData.pagination && logsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, logsData.pagination.total)} of {logsData.pagination.total} emails
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= logsData.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No email logs found for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats by Template Type */}
      {analytics?.byTemplate && analytics.byTemplate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Template Type</CardTitle>
            <CardDescription>Delivery and engagement metrics for each template</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Type</TableHead>
                  <TableHead className="text-right">Total Sent</TableHead>
                  <TableHead className="text-right">Delivery Rate</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.byTemplate.map((template) => (
                  <TableRow key={template.templateType}>
                    <TableCell>
                      <Badge variant="outline">{template.templateType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{template.total.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{template.deliveryRate}%</TableCell>
                    <TableCell className="text-right">{template.openRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
