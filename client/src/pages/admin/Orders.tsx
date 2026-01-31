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
import { Loader2, Eye, Search, ArrowUpDown, Download, Calendar, CheckSquare, Square, Printer, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');

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

  // Check if order is urgent (scheduled within 1 hour)
  const isOrderUrgent = (scheduledFor: string | null) => {
    if (!scheduledFor) return false;
    const scheduledTime = new Date(scheduledFor).getTime();
    const now = new Date().getTime();
    const oneHour = 60 * 60 * 1000;
    const timeDiff = scheduledTime - now;
    return timeDiff > 0 && timeDiff <= oneHour;
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

  // Export to CSV function
  const exportToCSV = () => {
    if (!filteredAndSortedOrders || filteredAndSortedOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const csvHeaders = [
      'Order Number',
      'Date',
      'Customer Name',
      'Email',
      'Phone',
      'Order Type',
      'Scheduled For',
      'Status',
      'Payment Status',
      'Total',
      'Delivery Address',
      'Postcode',
      'Special Instructions',
    ];

    const csvRows = filteredAndSortedOrders.map(order => [
      order.orderNumber,
      format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm'),
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      order.orderType,
      order.scheduledFor ? format(new Date(order.scheduledFor), 'yyyy-MM-dd HH:mm') : '',
      order.status,
      order.paymentStatus,
      `£${parseFloat(order.total).toFixed(2)}`,
      order.deliveryAddress || '',
      order.deliveryPostcode || '',
      order.specialInstructions || '',
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Orders exported to CSV');
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

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dateFrom;
      });
    }
    if (dateTo) {
      filtered = filtered.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        // Set time to end of day for dateTo
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        return orderDate <= endOfDay;
      });
    }

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
  }, [orders, searchQuery, sortBy, sortOrder, dateFrom, dateTo]);

  return (
    <AdminGuard>
      <AdminLayout>
        <div>
          <h1 className="text-4xl font-bold mb-8">Orders Management</h1>

          {/* Search, Filter, and Sort Controls */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
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
                  disabled={!filteredAndSortedOrders || filteredAndSortedOrders.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedOrderIds.length > 0 && (
            <Card className="border-border/50 mb-4 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''} selected
                    </span>
                    <Select value={bulkStatus} onValueChange={setBulkStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Change status to..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={async () => {
                        if (!bulkStatus) {
                          toast.error('Please select a status');
                          return;
                        }
                        try {
                          await Promise.all(
                            selectedOrderIds.map(orderId =>
                              updateStatusMutation.mutateAsync({ orderId, status: bulkStatus })
                            )
                          );
                          toast.success(`${selectedOrderIds.length} order(s) updated`);
                          setSelectedOrderIds([]);
                          setBulkStatus('');
                        } catch (error) {
                          toast.error('Failed to update some orders');
                        }
                      }}
                      disabled={!bulkStatus || updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Apply to Selected
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOrderIds([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={selectedOrderIds.length === filteredAndSortedOrders.length && filteredAndSortedOrders.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedOrderIds(filteredAndSortedOrders.map((o: any) => o.id));
                                } else {
                                  setSelectedOrderIds([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Order #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Scheduled For</TableHead>
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
                            <TableCell>
                              <Checkbox
                                checked={selectedOrderIds.includes(order.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedOrderIds([...selectedOrderIds, order.id]);
                                  } else {
                                    setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                                  }
                                }}
                              />
                            </TableCell>
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
                            <TableCell className="text-sm">
                              {order.scheduledFor ? (
                                <div className={`flex items-center gap-2 ${isOrderUrgent(order.scheduledFor) ? 'text-orange-500 font-semibold' : ''}`}>
                                  <div className="flex flex-col">
                                    <span>{format(new Date(order.scheduledFor), 'MMM dd, yyyy')}</span>
                                    <span className={isOrderUrgent(order.scheduledFor) ? 'text-orange-400 text-xs' : 'text-muted-foreground text-xs'}>{format(new Date(order.scheduledFor), 'HH:mm')}</span>
                                  </div>
                                  {isOrderUrgent(order.scheduledFor) && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Urgent
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
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
              <div className="flex items-center justify-between">
                <DialogTitle>Order Details - #{selectedOrder?.orderNumber}</DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    
                    const items = parseOrderItems(selectedOrder.items);
                    const subtotal = items.reduce((sum: number, item: any) => 
                      sum + (item.quantity * parseFloat(item.price)), 0
                    );
                    const deliveryFee = selectedOrder.orderType === 'delivery' ? 5.00 : 0;
                    
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Order Receipt - ${selectedOrder.orderNumber}</title>
                          <style>
                            body {
                              font-family: Arial, sans-serif;
                              max-width: 800px;
                              margin: 0 auto;
                              padding: 20px;
                            }
                            .header {
                              text-align: center;
                              border-bottom: 2px solid #d4a574;
                              padding-bottom: 20px;
                              margin-bottom: 20px;
                            }
                            .header h1 {
                              color: #d4a574;
                              margin: 0;
                            }
                            .section {
                              margin-bottom: 20px;
                            }
                            .section h2 {
                              color: #333;
                              border-bottom: 1px solid #ddd;
                              padding-bottom: 5px;
                            }
                            .info-grid {
                              display: grid;
                              grid-template-columns: 1fr 1fr;
                              gap: 10px;
                            }
                            .info-item {
                              margin-bottom: 10px;
                            }
                            .info-label {
                              color: #666;
                              font-size: 12px;
                            }
                            .info-value {
                              font-weight: bold;
                            }
                            table {
                              width: 100%;
                              border-collapse: collapse;
                              margin-top: 10px;
                            }
                            th, td {
                              padding: 8px;
                              text-align: left;
                              border-bottom: 1px solid #ddd;
                            }
                            th {
                              background-color: #f5f5f5;
                            }
                            .text-right {
                              text-align: right;
                            }
                            .text-center {
                              text-align: center;
                            }
                            .total-row {
                              font-size: 18px;
                              font-weight: bold;
                              border-top: 2px solid #333;
                            }
                            .footer {
                              text-align: center;
                              margin-top: 40px;
                              padding-top: 20px;
                              border-top: 1px solid #ddd;
                              color: #666;
                              font-size: 12px;
                            }
                            @media print {
                              body { padding: 0; }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h1>Boomiis Restaurant</h1>
                            <p>Authentic West African Cuisine</p>
                            <p>123 High Street, London, UK SW1A 1AA | +44 20 1234 5678</p>
                          </div>
                          
                          <div class="section">
                            <h2>Order Receipt</h2>
                            <div class="info-grid">
                              <div class="info-item">
                                <div class="info-label">Order Number</div>
                                <div class="info-value">${selectedOrder.orderNumber}</div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">Date</div>
                                <div class="info-value">${format(new Date(selectedOrder.createdAt), 'MMM dd, yyyy HH:mm')}</div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">Order Type</div>
                                <div class="info-value" style="text-transform: capitalize;">${selectedOrder.orderType}</div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">Status</div>
                                <div class="info-value" style="text-transform: capitalize;">${selectedOrder.status}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div class="section">
                            <h2>Customer Information</h2>
                            <div class="info-grid">
                              <div class="info-item">
                                <div class="info-label">Name</div>
                                <div class="info-value">${selectedOrder.customerName}</div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">Email</div>
                                <div class="info-value">${selectedOrder.customerEmail}</div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">Phone</div>
                                <div class="info-value">${selectedOrder.customerPhone}</div>
                              </div>
                            </div>
                          </div>
                          
                          ${selectedOrder.orderType === 'delivery' ? `
                            <div class="section">
                              <h2>Delivery Information</h2>
                              <div class="info-item">
                                <div class="info-label">Address</div>
                                <div class="info-value">${selectedOrder.deliveryAddress}</div>
                              </div>
                              ${selectedOrder.deliveryPostcode ? `
                                <div class="info-item">
                                  <div class="info-label">Postcode</div>
                                  <div class="info-value">${selectedOrder.deliveryPostcode}</div>
                                </div>
                              ` : ''}
                              ${selectedOrder.specialInstructions ? `
                                <div class="info-item">
                                  <div class="info-label">Special Instructions</div>
                                  <div class="info-value">${selectedOrder.specialInstructions}</div>
                                </div>
                              ` : ''}
                            </div>
                          ` : ''}
                          
                          <div class="section">
                            <h2>Order Items</h2>
                            <table>
                              <thead>
                                <tr>
                                  <th>Item</th>
                                  <th class="text-center">Quantity</th>
                                  <th class="text-right">Price</th>
                                  <th class="text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${items.map((item: any) => `
                                  <tr>
                                    <td>${item.name}</td>
                                    <td class="text-center">${item.quantity}</td>
                                    <td class="text-right">£${parseFloat(item.price).toFixed(2)}</td>
                                    <td class="text-right">£${(item.quantity * parseFloat(item.price)).toFixed(2)}</td>
                                  </tr>
                                `).join('')}
                                <tr>
                                  <td colspan="3" class="text-right"><strong>Subtotal</strong></td>
                                  <td class="text-right"><strong>£${subtotal.toFixed(2)}</strong></td>
                                </tr>
                                ${deliveryFee > 0 ? `
                                  <tr>
                                    <td colspan="3" class="text-right"><strong>Delivery Fee</strong></td>
                                    <td class="text-right"><strong>£${deliveryFee.toFixed(2)}</strong></td>
                                  </tr>
                                ` : ''}
                                <tr class="total-row">
                                  <td colspan="3" class="text-right">Total</td>
                                  <td class="text-right">£${parseFloat(selectedOrder.total).toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          
                          <div class="footer">
                            <p>Thank you for your order!</p>
                            <p>For any questions, please contact us at +44 20 1234 5678</p>
                          </div>
                          
                          <script>
                            window.onload = function() {
                              window.print();
                            };
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
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
