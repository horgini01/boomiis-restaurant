import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Calendar, Users, Mail, Phone, MapPin, DollarSign, Eye, Search, ArrowUpDown, Download, Power } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function EventsManagement() {
  const [statusFilter, setStatusFilter] = useState<'new' | 'contacted' | 'quoted' | 'booked' | 'cancelled' | undefined>(undefined);
  const [eventsEnabled, setEventsEnabled] = useState(true);
  const [closureMessage, setClosureMessage] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'guestCount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const utils = trpc.useUtils();

  // Fetch current settings
  const { data: settings } = trpc.systemSettings.getPublicSettings.useQuery();
  
  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setEventsEnabled(settings.eventsEnabled);
      setClosureMessage(settings.eventsClosureMessage);
    }
  }, [settings]);

  const updateSettingsMutation = trpc.systemSettings.updateEventsSettings.useMutation({
    onSuccess: () => {
      toast.success('Events settings updated successfully');
      utils.systemSettings.getPublicSettings.invalidate();
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  const handleToggleChange = (enabled: boolean) => {
    setEventsEnabled(enabled);
    updateSettingsMutation.mutate({ enabled, closureMessage });
  };

  const handleMessageChange = (message: string) => {
    setClosureMessage(message);
  };

  const handleSaveMessage = () => {
    updateSettingsMutation.mutate({ enabled: eventsEnabled, closureMessage });
  };
  
  const { data: inquiries, isLoading } = trpc.eventInquiries.list.useQuery({
    status: statusFilter,
    limit: 100,
    search: searchQuery,
    dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
  });

  const updateStatusMutation = trpc.eventInquiries.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Event inquiry status updated successfully');
      utils.eventInquiries.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update inquiry status');
    },
  });

  const handleStatusChange = (id: number, status: 'new' | 'contacted' | 'quoted' | 'booked' | 'cancelled') => {
    updateStatusMutation.mutate({ id, status });
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const exportToCSV = () => {
    if (!filteredAndSortedInquiries || filteredAndSortedInquiries.length === 0) {
      toast.error('No event inquiries to export');
      return;
    }

    const csvHeaders = [
      'Customer Name',
      'Email',
      'Phone',
      'Event Type',
      'Event Date',
      'Guests',
      'Status',
      'Venue Address',
      'Budget',
      'Message',
      'Created At',
    ];

    const csvRows = filteredAndSortedInquiries.map(inquiry => [
      inquiry.customerName,
      inquiry.customerEmail,
      inquiry.customerPhone,
      inquiry.eventType,
      inquiry.eventDate ? format(new Date(inquiry.eventDate), 'yyyy-MM-dd') : '',
      inquiry.guestCount?.toString() || '',
      inquiry.status,
      inquiry.venueAddress || '',
      inquiry.budget || '',
      inquiry.message || '',
      format(new Date(inquiry.createdAt), 'yyyy-MM-dd hh:mm a'),
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `events_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Events exported to CSV');
  };

  const filteredAndSortedInquiries = useMemo(() => {
    if (!inquiries) return [];

    let filtered = [...inquiries];

    // Sort by selected field
    filtered.sort((a: any, b: any) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          const dateA = a.eventDate ? new Date(a.eventDate).getTime() : new Date(a.createdAt).getTime();
          const dateB = b.eventDate ? new Date(b.eventDate).getTime() : new Date(b.createdAt).getTime();
          comparison = dateA - dateB;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'guestCount':
          comparison = (a.guestCount || 0) - (b.guestCount || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [inquiries, sortBy, sortOrder]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'contacted':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'quoted':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'booked':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getEventTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      wedding: '💒 Wedding',
      corporate: '🏢 Corporate Event',
      birthday: '🎂 Birthday Party',
      private_dining: '🍽️ Private Dining',
      other: '🎉 Other',
    };
    return types[type] || type;
  };

  const stats = {
    total: inquiries?.length || 0,
    new: inquiries?.filter(i => i.status === 'new').length || 0,
    contacted: inquiries?.filter(i => i.status === 'contacted').length || 0,
    booked: inquiries?.filter(i => i.status === 'booked').length || 0,
  };

  return (
    
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">Events & Catering Management</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Power className={cn("h-5 w-5", eventsEnabled ? "text-green-500" : "text-red-500")} />
                <Label htmlFor="events-toggle" className="text-sm font-medium">
                  {eventsEnabled ? "Accepting Inquiries" : "Inquiries Closed"}
                </Label>
                <Switch
                  id="events-toggle"
                  checked={eventsEnabled}
                  onCheckedChange={handleToggleChange}
                />
              </div>
            </div>
          </div>

          {/* Closure Message Input */}
          {!eventsEnabled && (
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="pt-6">
                <Label htmlFor="events-closure-message" className="text-sm font-medium mb-2 block">
                  Closure Message (displayed to customers)
                </Label>
                <Textarea
                  id="events-closure-message"
                  placeholder="e.g., Not accepting event bookings during holiday season"
                  value={closureMessage}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  className="mb-2"
                  rows={3}
                />
                <Button onClick={handleSaveMessage} size="sm">
                  Save Message
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <div />
            <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search, Filter, and Sort Controls */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name, email, phone, or event type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="guestCount">Guest Count</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSortOrder}
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Date Range and Export */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">From:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <span className="text-sm text-muted-foreground">To:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="ml-auto">
                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  disabled={!filteredAndSortedInquiries || filteredAndSortedInquiries.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Inquiries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">New</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">{stats.new}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contacted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">{stats.contacted}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Booked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{stats.booked}</div>
              </CardContent>
            </Card>
          </div>

          {/* Inquiries Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedInquiries && filteredAndSortedInquiries.length > 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Event Date</TableHead>
                        <TableHead>Guests</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedInquiries.map((inquiry) => (
                        <TableRow key={inquiry.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {inquiry.customerName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div>{inquiry.customerName}</div>
                                <div className="text-xs text-muted-foreground">{inquiry.customerEmail}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{getEventTypeLabel(inquiry.eventType)}</span>
                          </TableCell>
                          <TableCell>
                            {inquiry.eventDate ? (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {format(new Date(inquiry.eventDate), 'MMM dd, yyyy')}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not specified</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {inquiry.guestCount ? (
                              <div className="flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{inquiry.guestCount}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(inquiry.status)}`}>
                              {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedInquiry(inquiry)}
                                className="p-2 hover:bg-accent rounded-md transition-colors"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <Select
                                value={inquiry.status}
                                onValueChange={(value) => handleStatusChange(inquiry.id, value as any)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="contacted">Contacted</SelectItem>
                                  <SelectItem value="quoted">Quoted</SelectItem>
                                  <SelectItem value="booked">Booked</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No event inquiries found</h3>
                <p className="text-muted-foreground">
                  {statusFilter ? `No ${statusFilter} inquiries at the moment.` : 'No event inquiries have been submitted yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Inquiry Details Dialog */}
        <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Event Inquiry Details</DialogTitle>
              <DialogDescription>
                Submitted on {selectedInquiry && format(new Date(selectedInquiry.createdAt), 'MMM dd, yyyy HH:mm')}
              </DialogDescription>
            </DialogHeader>

            {selectedInquiry && (
              <div className="space-y-6">
                {/* Customer Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedInquiry.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${selectedInquiry.customerEmail}`} className="text-primary hover:underline">
                        {selectedInquiry.customerEmail}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedInquiry.customerPhone}`} className="text-primary hover:underline">
                        {selectedInquiry.customerPhone}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Event Details</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Event Type:</span>
                      <div className="font-medium mt-1">{getEventTypeLabel(selectedInquiry.eventType)}</div>
                    </div>
                    
                    {selectedInquiry.eventDate && (
                      <div>
                        <span className="text-muted-foreground">Event Date:</span>
                        <div className="font-medium mt-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(selectedInquiry.eventDate), 'MMMM dd, yyyy')}
                        </div>
                      </div>
                    )}

                    {selectedInquiry.guestCount && (
                      <div>
                        <span className="text-muted-foreground">Number of Guests:</span>
                        <div className="font-medium mt-1 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {selectedInquiry.guestCount} guests
                        </div>
                      </div>
                    )}

                    {selectedInquiry.budget && (
                      <div>
                        <span className="text-muted-foreground">Budget:</span>
                        <div className="font-medium mt-1 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {selectedInquiry.budget.replace('_', ' - ').replace('under', 'Under')}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-muted-foreground">Venue Address:</span>
                      <div className="font-medium mt-1 flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="whitespace-pre-wrap">{selectedInquiry.venueAddress}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Additional Details</h3>
                  <div className="bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedInquiry.message}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Status</h3>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(selectedInquiry.status)}`}>
                    {selectedInquiry.status.charAt(0).toUpperCase() + selectedInquiry.status.slice(1)}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AdminLayout>
    
  );
}
