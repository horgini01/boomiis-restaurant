import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
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
import { Loader2, Calendar, Users, Mail, Phone, MapPin, DollarSign, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function EventsManagement() {
  const [statusFilter, setStatusFilter] = useState<'new' | 'contacted' | 'quoted' | 'booked' | 'cancelled' | undefined>(undefined);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const utils = trpc.useUtils();
  
  const { data: inquiries, isLoading } = trpc.eventInquiries.list.useQuery({
    status: statusFilter,
    limit: 100,
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
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">Events & Catering Management</h1>
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
          ) : inquiries && inquiries.length > 0 ? (
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
                      {inquiries.map((inquiry) => (
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
    </AdminGuard>
  );
}
