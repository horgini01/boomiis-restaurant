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
import { Loader2, Calendar, Users, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';

export default function ReservationsManagement() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'confirmed' | 'cancelled' | 'completed' | undefined>(undefined);
  const utils = trpc.useUtils();
  
  const { data: reservations, isLoading } = trpc.reservations.list.useQuery({
    status: statusFilter,
    limit: 100,
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
          ) : reservations && reservations.length > 0 ? (
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
                      {reservations.map((reservation) => (
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
