import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { Loader2, Eye, Search, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';

export default function OrdersManagement() {
  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.admin.getOrders.useQuery();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const updateStatusMutation = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success('Order status updated');
      utils.admin.getOrders.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update order status');
    },
  });

  const handleStatusChange = (orderId: number, status: string) => {
    updateStatusMutation.mutate({ orderId, status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'confirmed':
        return 'bg-blue-500/10 text-blue-500';
      case 'preparing':
        return 'bg-purple-500/10 text-purple-500';
      case 'ready':
        return 'bg-green-500/10 text-green-500';
      case 'completed':
        return 'bg-gray-500/10 text-gray-500';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const parseOrderItems = (itemsJson: string | null | undefined): any[] => {
    if (!itemsJson) return [];
    try {
      const parsed = JSON.parse(itemsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to parse order items:', error);
      return [];
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    if (!orders) return [];

    // Filter by search query
    let filtered = orders.filter((order: any) => {
      const query = searchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.customerEmail.toLowerCase().includes(query) ||
        order.customerPhone.toLowerCase().includes(query)
      );
    });

    // Sort by selected field
    filtered.sort((a: any, b: any) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'total':
          comparison = parseFloat(a.total) - parseFloat(b.total);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [orders, searchQuery, sortBy, sortOrder]);

  return (
    <AdminGuard>
      <AdminLayout>
        <div>
          <h1 className="text-4xl font-bold mb-8">Orders Management</h1>

          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, customer name, email, or phone..."
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
                  <SelectItem value="total">Total</SelectItem>
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

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {filteredAndSortedOrders.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No orders found matching your search.' : 'No orders yet.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/50">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Stripe ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedOrders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.customerName}</p>
                                <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                                <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                                {order.orderType === 'delivery' && order.deliveryAddress && (
                                  <>
                                    <p className="text-sm text-muted-foreground mt-1">{order.deliveryAddress}</p>
                                    {order.deliveryPostcode && (
                                      <p className="text-sm text-muted-foreground">{order.deliveryPostcode}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{order.orderType}</TableCell>
                            <TableCell className="font-medium">£{parseFloat(order.total).toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                order.paymentStatus === 'paid'
                                  ? 'bg-green-500/10 text-green-500'
                                  : order.paymentStatus === 'failed'
                                  ? 'bg-red-500/10 text-red-500'
                                  : 'bg-yellow-500/10 text-yellow-500'
                              }`}>
                                {order.paymentStatus}
                              </span>
                            </TableCell>
                            <TableCell>
                              {order.paymentIntentId ? (
                                <a
                                  href={`https://dashboard.stripe.com/test/payments/${order.paymentIntentId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline font-mono"
                                  title="View in Stripe Dashboard"
                                >
                                  {order.paymentIntentId.substring(0, 20)}...
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(order)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                                <Select
                                  value={order.status}
                                  onValueChange={(value) => handleStatusChange(order.id, value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="preparing">Preparing</SelectItem>
                                    <SelectItem value="ready">Ready</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Order Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder?.orderNumber}</DialogTitle>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Customer Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedOrder.customerName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedOrder.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedOrder.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Order Type</p>
                      <p className="font-medium capitalize">{selectedOrder.orderType}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                {selectedOrder.orderType === 'delivery' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Delivery Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                      </div>
                      {selectedOrder.deliveryPostcode && (
                        <div>
                          <p className="text-muted-foreground">Postcode</p>
                          <p className="font-medium">{selectedOrder.deliveryPostcode}</p>
                        </div>
                      )}
                      {selectedOrder.specialInstructions && (
                        <div>
                          <p className="text-muted-foreground">Special Instructions</p>
                          <p className="font-medium">{selectedOrder.specialInstructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parseOrderItems(selectedOrder.items).map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">£{parseFloat(item.price).toFixed(2)}</TableCell>
                            <TableCell className="text-right">£{(item.quantity * parseFloat(item.price)).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        £{parseOrderItems(selectedOrder.items).reduce((sum: number, item: any) => 
                          sum + (item.quantity * parseFloat(item.price)), 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    {selectedOrder.orderType === 'delivery' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Fee</span>
                        <span className="font-medium">£5.00</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>£{parseFloat(selectedOrder.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Status */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Order Status</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Order Status</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payment Status</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedOrder.paymentStatus === 'paid'
                          ? 'bg-green-500/10 text-green-500'
                          : selectedOrder.paymentStatus === 'failed'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {selectedOrder.paymentStatus}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Order Date</p>
                      <p className="font-medium">
                        {format(new Date(selectedOrder.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    {selectedOrder.paymentIntentId && (
                      <div>
                        <p className="text-muted-foreground">Stripe Payment</p>
                        <a
                          href={`https://dashboard.stripe.com/test/payments/${selectedOrder.paymentIntentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          View in Dashboard
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AdminGuard>
  );
}
