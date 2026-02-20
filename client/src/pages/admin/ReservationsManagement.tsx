import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Calendar, Users, Mail, Phone, Search, ArrowUpDown, Download, Power } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useMemo, useEffect } from 'react';

export default function ReservationsManagement() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'confirmed' | 'cancelled' | 'completed' | undefined>(undefined);
  const [reservationsEnabled, setReservationsEnabled] = useState(true);
  const [closureMessage, setClosureMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'partySize'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const utils = trpc.useUtils();

  // Fetch current settings
  const { data: settings } = trpc.systemSettings.getPublicSettings.useQuery();
  
  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setReservationsEnabled(settings.reservationsEnabled);
      setClosureMessage(settings.reservationsClosureMessage);
    }
  }, [settings]);

  const updateSettingsMutation = trpc.systemSettings.updateReservationSettings.useMutation({
    onSuccess: (_, variables) => {
      if (variables.enabled !== undefined) {
        toast.success(variables.enabled ? 'Reservations enabled' : 'Reservations disabled');
      } else {
        toast.success('Reservation settings updated successfully');
      }
      utils.systemSettings.getPublicSettings.invalidate();
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  const handleToggleChange = (enabled: boolean) => {
    setReservationsEnabled(enabled);
    // Don't auto-save - user must click Save Settings button
  };
  
  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({ 
      enabled: reservationsEnabled, 
      closureMessage 
    });
  };

  const handleMessageChange = (message: string) => {
    setClosureMessage(message);
  };

  const handleSaveMessage = () => {
    updateSettingsMutation.mutate({ enabled: reservationsEnabled, closureMessage });
  };
  
  const { data: reservations, isLoading } = trpc.reservations.list.useQuery({
    status: statusFilter,
    limit: 100,
    search: searchQuery,
    dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
  });

  const updateStatusMutation = trpc.reservations.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Reservation status updated successfully');
      utils.reservations.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update reservation status');
    },
  });

  const handleStatusChange = (id: number, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    updateStatusMutation.mutate({ id, status });
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const exportToCSV = () => {
    if (!filteredAndSortedReservations || filteredAndSortedReservations.length === 0) {
      toast.error('No reservations to export');
      return;
    }

    const csvHeaders = [
      'Customer Name',
      'Email',
      'Phone',
      'Party Size',
      'Reservation Date',
      'Reservation Time',
      'Status',
      'Special Requests',
      'Created At',
    ];

    const csvRows = filteredAndSortedReservations.map(reservation => [
      reservation.customerName,
      reservation.customerEmail,
      reservation.customerPhone,
      reservation.partySize.toString(),
      format(new Date(reservation.reservationDate), 'yyyy-MM-dd'),
      reservation.reservationTime,
      reservation.status,
      reservation.specialRequests || '',
      format(new Date(reservation.createdAt), 'yyyy-MM-dd hh:mm a'),
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
    link.setAttribute('download', `reservations_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reservations exported to CSV');
  };

  const filteredAndSortedReservations = useMemo(() => {
    if (!reservations) return [];

    let filtered = [...reservations];

    // Sort by selected field
    filtered.sort((a: any, b: any) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.reservationDate).getTime() - new Date(b.reservationDate).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'partySize':
          comparison = a.partySize - b.partySize;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [reservations, sortBy, sortOrder]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'confirmed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const stats = {
    total: reservations?.length || 0,
    pending: reservations?.filter(r => r.status === 'pending').length || 0,
    confirmed: reservations?.filter(r => r.status === 'confirmed').length || 0,
    completed: reservations?.filter(r => r.status === 'completed').length || 0,
  };

  return (
    
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">Reservations Management</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Power className={cn("h-5 w-5", reservationsEnabled ? "text-green-500" : "text-red-500")} />
                <Label htmlFor="reservations-toggle" className="text-sm font-medium">
                  {reservationsEnabled ? "Accepting Reservations" : "Reservations Closed"}
                </Label>
                <Switch
                  id="reservations-toggle"
                  checked={reservationsEnabled}
                  onCheckedChange={handleToggleChange}
                />
              </div>
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                size="sm"
              >
                {updateSettingsMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </div>

          {/* Closure Message Input */}
          {!reservationsEnabled && (
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="pt-6">
                <Label htmlFor="closure-message" className="text-sm font-medium mb-2 block">
                  Closure Message (displayed to customers)
                </Label>
                <Textarea
                  id="closure-message"
                  placeholder="e.g., Closed for renovations until March 1st"
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
            <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
                  placeholder="Search by customer name, email, or phone..."
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
                    <SelectItem value="partySize">Party Size</SelectItem>
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
                  disabled={!filteredAndSortedReservations || filteredAndSortedReservations.length === 0}
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Reservations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{stats.confirmed}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">{stats.completed}</div>
              </CardContent>
            </Card>
          </div>

          {/* Reservations Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedReservations && filteredAndSortedReservations.length > 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Party Size</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Special Requests</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedReservations.map((reservation) => (
                        <TableRow key={reservation.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {reservation.customerName.charAt(0).toUpperCase()}
                              </div>
                              {reservation.customerName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                {reservation.customerEmail}
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                {reservation.customerPhone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{reservation.partySize}</span>
                              <span className="text-muted-foreground text-sm">guests</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {format(new Date(reservation.reservationDate), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground pl-5">
                                {reservation.reservationTime}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(reservation.status)}`}>
                              {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-sm text-muted-foreground truncate">
                              {reservation.specialRequests || '-'}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={reservation.status}
                              onValueChange={(value) => handleStatusChange(reservation.id, value as any)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
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
                <h3 className="text-lg font-semibold mb-2">No reservations found</h3>
                <p className="text-muted-foreground">
                  {statusFilter ? `No ${statusFilter} reservations at the moment.` : 'No reservations have been made yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    
  );
}
