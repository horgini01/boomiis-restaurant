import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Loader2, TrendingUp, DollarSign, ShoppingCart, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { format, startOfDay, subDays, eachDayOfInterval } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function Analytics() {
  const { data: orders, isLoading } = trpc.admin.getOrders.useQuery();

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    if (!orders || orders.length === 0) return null;

    // Filter paid orders only
    const paidOrders = orders.filter((o: any) => o.paymentStatus === 'paid');

    // Daily sales for last 30 days
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    const dailySales = last30Days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = paidOrders.filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });

      const total = dayOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total), 0);

      return {
        date: format(day, 'MMM dd'),
        sales: parseFloat(total.toFixed(2)),
        orders: dayOrders.length,
      };
    });

    // Popular items
    const itemCounts: Record<string, number> = {};
    paidOrders.forEach((order: any) => {
      try {
        const items = JSON.parse(order.items || '[]');
        items.forEach((item: any) => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
      } catch (e) {
        // Skip invalid items
      }
    });

    const popularItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Peak ordering times (by hour)
    const hourCounts: Record<number, number> = {};
    paidOrders.forEach((order: any) => {
      const hour = new Date(order.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakTimes = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      orders: hourCounts[hour] || 0,
    }));

    // Order type distribution
    const deliveryCount = paidOrders.filter((o: any) => o.orderType === 'delivery').length;
    const pickupCount = paidOrders.filter((o: any) => o.orderType === 'pickup').length;

    const orderTypeData = [
      { name: 'Delivery', value: deliveryCount, color: '#d4a574' },
      { name: 'Pickup', value: pickupCount, color: '#8b7355' },
    ];

    // Calculate average prep time
    const prepTimes: number[] = [];
    paidOrders.forEach((order: any) => {
      try {
        const timeline: Array<{status: string, timestamp: string}> = order.timeline ? JSON.parse(order.timeline) : [];
        const preparingEntry = timeline.find(t => t.status === 'preparing');
        const readyEntry = timeline.find(t => t.status === 'ready');
        
        if (preparingEntry && readyEntry) {
          const prepStart = new Date(preparingEntry.timestamp).getTime();
          const prepEnd = new Date(readyEntry.timestamp).getTime();
          const prepTimeMinutes = (prepEnd - prepStart) / (1000 * 60);
          if (prepTimeMinutes > 0 && prepTimeMinutes < 300) { // Filter outliers (< 5 hours)
            prepTimes.push(prepTimeMinutes);
          }
        }
      } catch (e) {
        // Skip invalid timeline
      }
    });

    const averagePrepTime = prepTimes.length > 0
      ? prepTimes.reduce((sum, time) => sum + time, 0) / prepTimes.length
      : 0;

    // Summary stats
    const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total), 0);
    const averageOrderValue = totalRevenue / paidOrders.length || 0;

    return {
      dailySales,
      popularItems,
      peakTimes,
      orderTypeData,
      totalRevenue,
      averageOrderValue,
      totalOrders: paidOrders.length,
      averagePrepTime,
      prepTimeSampleSize: prepTimes.length,
    };
  }, [orders]);

  if (isLoading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  if (!analyticsData || analyticsData.totalOrders === 0) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div>
            <h1 className="text-4xl font-bold mb-8">Analytics Dashboard</h1>
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">
                  No paid orders yet. Analytics will appear once you have order data.
                </p>
              </CardContent>
            </Card>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div>
          <h1 className="text-4xl font-bold mb-8">Analytics Dashboard</h1>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£{analyticsData.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">From paid orders</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalOrders}</div>
                <p className="text-xs text-muted-foreground">Completed & paid</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£{analyticsData.averageOrderValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Per order</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Prep Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.averagePrepTime > 0 
                    ? `${Math.round(analyticsData.averagePrepTime)} min`
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.prepTimeSampleSize > 0
                    ? `From ${analyticsData.prepTimeSampleSize} orders`
                    : 'No data yet'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Sales Trend */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Daily Sales (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#d4a574" strokeWidth={2} name="Sales (£)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Order Type Distribution */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Order Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.orderTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.orderTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Popular Items */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Top 10 Popular Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.popularItems} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#d4a574" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Peak Ordering Times */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Peak Ordering Times</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.peakTimes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#8b7355" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
