import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Clock, CheckCircle2, AlertCircle, ChefHat, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';

export default function KitchenDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [previousUrgentOrders, setPreviousUrgentOrders] = useState<Set<number>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const { restaurantName, restaurantLogo } = useSettings();
  
  // Update current time every second for timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.admin.getOrders.useQuery(undefined, {
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Play alert sound
  const playAlertSound = () => {
    if (!soundEnabled) return;
    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  // Monitor for new urgent orders
  useEffect(() => {
    if (!orders) return;
    
    const currentUrgentOrders = new Set<number>();
    orders.forEach(order => {
      const scheduledForStr = order.scheduledFor ? order.scheduledFor.toString() : null;
      if (isUrgent(scheduledForStr) && !['completed', 'cancelled'].includes(order.status)) {
        currentUrgentOrders.add(order.id);
      }
    });
    
    // Check for newly urgent orders
    currentUrgentOrders.forEach(orderId => {
      if (!previousUrgentOrders.has(orderId)) {
        playAlertSound();
      }
    });
    
    setPreviousUrgentOrders(currentUrgentOrders);
  }, [orders, currentTime]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatusMutation = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      utils.admin.getOrders.invalidate();
      toast.success('Order status updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  // Filter to show only active orders (not completed or cancelled)
  let activeOrders = orders?.filter(
    (order) => !['completed', 'cancelled'].includes(order.status)
  ) || [];
  
  // Apply order type filter
  if (orderTypeFilter !== 'all') {
    activeOrders = activeOrders.filter(order => order.orderType === orderTypeFilter);
  }

  // Sort by urgency (scheduled time) and status
  const sortedOrders = [...activeOrders].sort((a, b) => {
    // Priority 1: Orders that are preparing come first
    if (a.status === 'preparing' && b.status !== 'preparing') return -1;
    if (b.status === 'preparing' && a.status !== 'preparing') return 1;
    
    // Priority 2: Sort by scheduled time (earliest first)
    if (a.scheduledFor && b.scheduledFor) {
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    }
    if (a.scheduledFor) return -1;
    if (b.scheduledFor) return 1;
    
    // Priority 3: Sort by order creation time
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const getTimeRemaining = (scheduledFor: string | null) => {
    if (!scheduledFor) return null;
    const scheduled = new Date(scheduledFor).getTime();
    const now = currentTime.getTime();
    const diff = scheduled - now;
    
    if (diff < 0) return 'OVERDUE';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const isUrgent = (scheduledFor: string | null) => {
    if (!scheduledFor) return false;
    const scheduled = new Date(scheduledFor).getTime();
    const now = currentTime.getTime();
    const diff = scheduled - now;
    return diff > 0 && diff <= 60 * 60 * 1000; // Within 1 hour
  };

  const isOverdue = (scheduledFor: string | null) => {
    if (!scheduledFor) return false;
    return new Date(scheduledFor).getTime() < currentTime.getTime();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'confirmed':
        return 'bg-blue-500';
      case 'preparing':
        return 'bg-purple-500';
      case 'ready':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading kitchen display...</div>
      </div>
    );
  }

  return (
    <div className="kitchen-display-container min-h-screen bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {restaurantLogo ? (
            <img 
              src={restaurantLogo} 
              alt={restaurantName} 
              className="h-16 w-auto object-contain"
            />
          ) : (
            <ChefHat className="h-10 w-10 text-orange-500" />
          )}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Kitchen Display</h1>
            <p className="text-gray-400 text-sm">{restaurantName}</p>
            <p className="text-gray-400 text-lg">{format(currentTime, 'EEEE, MMMM d, yyyy • h:mm:ss a')}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-5xl font-bold text-white">{activeOrders.length}</div>
            <div className="text-gray-400 text-lg">Active Orders</div>
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.print()}
              className="h-14 px-6 bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              <Printer className="h-5 w-5 mr-2" />
              Print All
            </Button>
            <Button
              size="lg"
              variant={soundEnabled ? "default" : "outline"}
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-14 px-6"
            >
              {soundEnabled ? '🔔 Sound On' : '🔕 Sound Off'}
            </Button>
          </div>
        </div>
      </div>

      {/* Order Type Filter */}
      <div className="mb-6 flex justify-center gap-3">
        <Button
          size="lg"
          variant={orderTypeFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setOrderTypeFilter('all')}
          className="h-12 px-8 text-lg"
        >
          All Orders
        </Button>
        <Button
          size="lg"
          variant={orderTypeFilter === 'delivery' ? 'default' : 'outline'}
          onClick={() => setOrderTypeFilter('delivery')}
          className="h-12 px-8 text-lg"
        >
          Delivery Only
        </Button>
        <Button
          size="lg"
          variant={orderTypeFilter === 'pickup' ? 'default' : 'outline'}
          onClick={() => setOrderTypeFilter('pickup')}
          className="h-12 px-8 text-lg"
        >
          Pickup Only
        </Button>
      </div>

      {/* Orders Grid */}
      {sortedOrders.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <p className="text-3xl text-white font-semibold">All Caught Up!</p>
            <p className="text-xl text-gray-400 mt-2">No active orders at the moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedOrders.map((order) => {
            const scheduledForStr = order.scheduledFor ? order.scheduledFor.toString() : null;
            const timeRemaining = getTimeRemaining(scheduledForStr);
            const urgent = isUrgent(scheduledForStr);
            const overdue = isOverdue(scheduledForStr);
            
            // Parse order items
            let orderItems: any[] = [];
            try {
              orderItems = order.items ? JSON.parse(order.items) : [];
            } catch (e) {
              console.error('Failed to parse order items:', e);
            }

            return (
              <Card
                key={order.id}
                className={`${
                  overdue
                    ? 'bg-red-900/30 border-red-500 border-2'
                    : urgent
                    ? 'bg-orange-900/30 border-orange-500 border-2'
                    : 'bg-gray-800 border-gray-700'
                } transition-all`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-3xl font-bold text-white mb-1">
                        #{order.orderNumber}
                      </CardTitle>
                      <p className="text-xl text-gray-300">{order.customerName}</p>
                      <p className="text-lg text-gray-400">{order.customerPhone}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={`${getStatusColor(order.status)} text-white text-base px-3 py-1 mb-2`}>
                        {order.status.toUpperCase()}
                      </Badge>
                      <div className="text-lg font-semibold text-white capitalize">
                        {order.orderType}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Timing Information */}
                  {order.scheduledFor && (
                    <div className={`p-4 rounded-lg ${
                      overdue
                        ? 'bg-red-500/20'
                        : urgent
                        ? 'bg-orange-500/20'
                        : 'bg-blue-500/20'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {overdue ? (
                            <AlertCircle className="h-6 w-6 text-red-400" />
                          ) : (
                            <Clock className="h-6 w-6 text-white" />
                          )}
                          <span className="text-gray-300 text-lg">
                            {order.orderType === 'pickup' ? 'Pickup' : 'Delivery'} Time:
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">
                            {format(new Date(order.scheduledFor), 'h:mm a')}
                          </div>
                          {timeRemaining && (
                            <div className={`text-lg font-semibold ${
                              overdue ? 'text-red-400' : urgent ? 'text-orange-400' : 'text-green-400'
                            }`}>
                              {timeRemaining}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h3 className="text-xl font-semibold text-white mb-3">Items:</h3>
                    <div className="space-y-2">
                      {orderItems.length > 0 ? (
                        orderItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-lg">
                            <span className="text-gray-300">
                              <span className="font-bold text-white text-2xl mr-2">
                                {item.quantity}x
                              </span>
                              {item.name}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-lg">No items listed</p>
                      )}
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {order.specialInstructions && (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-yellow-400 mb-2">Special Instructions:</h3>
                      <p className="text-white text-lg">{order.specialInstructions}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {order.status === 'pending' && (
                      <Button
                        size="lg"
                        className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white text-lg h-14"
                        onClick={() => handleStatusChange(order.id, 'confirmed')}
                      >
                        Confirm Order
                      </Button>
                    )}
                    {order.status === 'confirmed' && (
                      <Button
                        size="lg"
                        className="col-span-2 bg-purple-600 hover:bg-purple-700 text-white text-lg h-14"
                        onClick={() => handleStatusChange(order.id, 'preparing')}
                      >
                        Start Preparing
                        </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button
                        size="lg"
                        className="col-span-2 bg-green-600 hover:bg-green-700 text-white text-lg h-14"
                        onClick={() => handleStatusChange(order.id, 'ready')}
                      >
                        Mark Ready
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button
                        size="lg"
                        className="col-span-2 bg-gray-600 hover:bg-gray-700 text-white text-lg h-14"
                        onClick={() => handleStatusChange(order.id, 'completed')}
                      >
                        Complete Order
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Add print styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      body * {
        visibility: hidden;
      }
      .kitchen-display-container,
      .kitchen-display-container * {
        visibility: visible;
      }
      .kitchen-display-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      /* Hide buttons and interactive elements */
      button {
        display: none !important;
      }
      /* Optimize for print */
      .bg-gray-900 {
        background: white !important;
      }
      .bg-gray-800 {
        background: white !important;
        border: 2px solid black !important;
      }
      .text-white {
        color: black !important;
      }
      .text-gray-300,
      .text-gray-400 {
        color: #333 !important;
      }
      /* Ensure cards print side by side */
      @page {
        size: landscape;
        margin: 1cm;
      }
    }
  `;
  document.head.appendChild(style);
}
