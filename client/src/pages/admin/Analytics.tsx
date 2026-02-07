import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { Loader2, TrendingUp, DollarSign, ShoppingCart, Clock, Users, Award, Download, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format, startOfDay, subDays, eachDayOfInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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

type DateRange = 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth';

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>('last30');

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateRange) {
      case 'last7':
        start = subDays(now, 6);
        break;
      case 'last30':
        start = subDays(now, 29);
        break;
      case 'last90':
        start = subDays(now, 89);
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      default:
        start = subDays(now, 29);
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  const { data: orders, isLoading: ordersLoading } = trpc.admin.getOrders.useQuery();
  const { data: customerInsights, isLoading: customerLoading } = trpc.admin.customerInsights.useQuery({ startDate, endDate });
  const { data: menuPerformance, isLoading: menuLoading } = trpc.admin.menuPerformance.useQuery({ startDate, endDate });
  const { data: reservationAnalytics, isLoading: reservationLoading } = trpc.admin.reservationAnalytics.useQuery({ startDate, endDate });

  // Calculate analytics data for charts
  const analyticsData = useMemo(() => {
    if (!orders || orders.length === 0) return null;

    // Filter paid orders only
    const paidOrders = orders.filter((o: any) => o.paymentStatus === 'paid');

    // Daily sales for date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysInRange = eachDayOfInterval({ start, end });

    const dailySales = daysInRange.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayOrders = paidOrders.filter((o: any) => 
        format(startOfDay(new Date(o.createdAt)), 'yyyy-MM-dd') === dayStr
      );
      const revenue = dayOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total), 0);
      
      return {
        date: format(day, 'MMM dd'),
        revenue: parseFloat(revenue.toFixed(2)),
        orders: dayOrders.length,
      };
    });

    // Total metrics
    const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total), 0);
    const totalOrders = paidOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Order type distribution
    const orderTypes: Record<string, number> = {};
    paidOrders.forEach((o: any) => {
      orderTypes[o.orderType] = (orderTypes[o.orderType] || 0) + 1;
    });

    const orderTypeData = Object.entries(orderTypes).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color: type === 'delivery' ? '#f59e0b' : type === 'pickup' ? '#3b82f6' : '#10b981',
    }));

    // Peak ordering times
    const hourCounts: Record<number, number> = {};
    paidOrders.forEach((o: any) => {
      const hour = new Date(o.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakTimesData = Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: `${hour}:00`,
        orders: count,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    return {
      dailySales,
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders,
      avgOrderValue: avgOrderValue.toFixed(2),
      orderTypeData,
      peakTimesData,
    };
  }, [orders, startDate, endDate]);

  const isLoading = ordersLoading || customerLoading || menuLoading || reservationLoading;

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">Analytics</h1>
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7">Last 7 Days</SelectItem>
                <SelectItem value="last30">Last 30 Days</SelectItem>
                <SelectItem value="last90">Last 90 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="sales" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger value="sales">Sales Overview</TabsTrigger>
                <TabsTrigger value="customers">Customer Insights</TabsTrigger>
                <TabsTrigger value="menu">Menu Performance</TabsTrigger>
                <TabsTrigger value="reservations">Reservations</TabsTrigger>
              </TabsList>

              {/* Sales Overview Tab */}
              <TabsContent value="sales">
                {analyticsData && (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">£{analyticsData.totalRevenue}</div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{analyticsData.totalOrders}</div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">£{analyticsData.avgOrderValue}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Charts */}
                    <div className="space-y-8">
                      {/* Daily Sales */}
                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle>Daily Sales Trend</CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportToCSV(analyticsData.dailySales, 'daily-sales')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={analyticsData.dailySales}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                              <XAxis dataKey="date" stroke="#888" />
                              <YAxis yAxisId="left" stroke="#888" />
                              <YAxis yAxisId="right" orientation="right" stroke="#888" />
                              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                              <Legend />
                              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#f59e0b" name="Revenue (£)" strokeWidth={2} animationDuration={800} animationBegin={0} />
                              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" name="Orders" strokeWidth={2} animationDuration={800} animationBegin={200} />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                  label={({ name, value }) => `${name}: ${value}`}
                                  outerRadius={100}
                                  fill="#8884d8"
                                  dataKey="value"
                                  animationDuration={800}
                                  animationBegin={0}
                                >
                                  {analyticsData.orderTypeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                              </PieChart>
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
                              <BarChart data={analyticsData.peakTimesData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="hour" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                <Bar dataKey="orders" fill="#f59e0b" name="Orders" animationDuration={800} animationBegin={0} />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Customer Insights Tab */}
              <TabsContent value="customers">
                {customerInsights && (
                  <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{customerInsights.totalCustomers}</div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Repeat Customers</CardTitle>
                          <Award className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{customerInsights.repeatCustomers}</div>
                          <p className="text-xs text-muted-foreground mt-1">{customerInsights.repeatRate} repeat rate</p>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Lifetime Value</CardTitle>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">£{customerInsights.avgLifetimeValue}</div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">New Customers</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{customerInsights.newCustomers}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Top Customers */}
                    <Card className="border-border/50">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Top 10 Customers</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportToCSV(customerInsights.topCustomers, 'top-customers')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {customerInsights.topCustomers.map((customer, index) => (
                            <div key={index} className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">£{customer.total}</p>
                                <p className="text-sm text-muted-foreground">{customer.orders} orders</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Menu Performance Tab */}
              <TabsContent value="menu">
                {menuPerformance && (
                  <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Total Items Sold</CardTitle>
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{menuPerformance.totalItemsSold}</div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Items/Order</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{menuPerformance.avgItemsPerOrder}</div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Never Ordered</CardTitle>
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{menuPerformance.neverOrdered.length}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Category Revenue */}
                    <Card className="border-border/50">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Revenue by Category</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportToCSV(menuPerformance.categoryRevenue, 'category-revenue')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={menuPerformance.categoryRevenue}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#888" />
                            <YAxis stroke="#888" />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                            <Bar dataKey="revenue" fill="#10b981" name="Revenue (£)" animationDuration={800} animationBegin={0} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Top Items */}
                      <Card className="border-border/50">
                        <CardHeader>
                          <CardTitle>Top 10 Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {menuPerformance.topItems.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-3 border border-border/50 rounded">
                                <div>
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.category}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-sm">£{item.revenue}</p>
                                  <p className="text-xs text-muted-foreground">{item.quantity} sold</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Bottom Items */}
                      <Card className="border-border/50">
                        <CardHeader>
                          <CardTitle>Bottom 10 Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {menuPerformance.bottomItems.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-3 border border-border/50 rounded">
                                <div>
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.category}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-sm">£{item.revenue}</p>
                                  <p className="text-xs text-muted-foreground">{item.quantity} sold</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Never Ordered Items */}
                    {menuPerformance.neverOrdered.length > 0 && (
                      <Card className="border-border/50 border-amber-500/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            Items Never Ordered
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {menuPerformance.neverOrdered.map((item, index) => (
                              <div key={index} className="p-3 border border-border/50 rounded">
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.category}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Reservation Analytics Tab */}
              <TabsContent value="reservations">
                {reservationAnalytics && (
                  <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Total Reservations</CardTitle>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{reservationAnalytics.totalReservations}</div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Party Size</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{reservationAnalytics.avgPartySize}</div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Cancellation Rate</CardTitle>
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{reservationAnalytics.cancellationRate}%</div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{reservationAnalytics.statusBreakdown.confirmed}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Status Breakdown */}
                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle>Reservation Status Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="p-4 border border-border/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Confirmed</p>
                            <p className="text-2xl font-bold text-green-500">{reservationAnalytics.statusBreakdown.confirmed}</p>
                          </div>
                          <div className="p-4 border border-border/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Pending</p>
                            <p className="text-2xl font-bold text-amber-500">{reservationAnalytics.statusBreakdown.pending}</p>
                          </div>
                          <div className="p-4 border border-border/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Cancelled</p>
                            <p className="text-2xl font-bold text-red-500">{reservationAnalytics.statusBreakdown.cancelled}</p>
                          </div>
                          <div className="p-4 border border-border/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Completed</p>
                            <p className="text-2xl font-bold text-blue-500">{reservationAnalytics.statusBreakdown.completed}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Busiest Days */}
                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle>Busiest Days of Week</CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportToCSV(reservationAnalytics.busiestDays, 'busiest-days')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reservationAnalytics.busiestDays}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                              <XAxis dataKey="day" stroke="#888" />
                              <YAxis stroke="#888" />
                              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                              <Bar dataKey="count" fill="#3b82f6" name="Reservations" animationDuration={800} animationBegin={0} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Peak Times */}
                      <Card className="border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle>Peak Booking Times</CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportToCSV(reservationAnalytics.peakTimes, 'peak-times')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reservationAnalytics.peakTimes}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                              <XAxis dataKey="hour" stroke="#888" />
                              <YAxis stroke="#888" />
                              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                              <Bar dataKey="count" fill="#f59e0b" name="Reservations" animationDuration={800} animationBegin={0} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
