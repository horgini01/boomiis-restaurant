import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
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
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ReservationsManagement() {
  const utils = trpc.useUtils();
  const { data: reservations, isLoading } = trpc.admin.getReservations.useQuery();

  const updateStatusMutation = trpc.admin.updateReservationStatus.useMutation({
    onSuccess: () => {
      toast.success('Reservation status updated');
      utils.admin.getReservations.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update reservation status');
    },
  });

  const handleStatusChange = (reservationId: number, status: string) => {
    updateStatusMutation.mutate({ reservationId, status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'confirmed':
        return 'bg-green-500/10 text-green-500';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500';
      case 'completed':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div>
          <h1 className="text-4xl font-bold mb-8">Reservations Management</h1>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-0">
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
                    {reservations?.map((reservation: any) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">{reservation.customerName}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{reservation.customerEmail}</p>
                            <p className="text-muted-foreground">{reservation.customerPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{reservation.partySize} guests</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">
                              {format(new Date(reservation.reservationDate), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-muted-foreground">{reservation.reservationTime}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                            {reservation.status}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {reservation.specialRequests || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={reservation.status}
                            onValueChange={(value) => handleStatusChange(reservation.id, value)}
                          >
                            <SelectTrigger className="w-32">
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
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
