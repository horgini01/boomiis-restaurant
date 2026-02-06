import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Loader2, TrendingUp, DollarSign, ShoppingCart, Clock, Users, Award, Download } from 'lucide-react';
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
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = paidOrders.filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });

      const total = dayOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total), 0);

      return {
        date: format(day, 'MMM d'),
        revenue: parseFloat(total.toFixed(2)),
        orders: dayOrders.length,
      };
    });

    // Order type distribution
    const deliveryOrders = paidOrders.filter((o: any) => o.orderType === 'delivery').length;
    const pickupOrders = paidOrders.filter((o: any) => o.orderType === 'pickup').length;

    const orderTypeData = [
      { name: 'Delivery', value: deliveryOrders, color: '#f59e0b' },
      { name: 'Pickup', value: pickupOrders, color: '#10b981' },
    ];

    // Peak ordering times
    const hourCounts: Record<number, number> = {};
    paidOrders.forEach((o: any) => {
      const hour = new Date(o.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakTimesData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      orders: hourCounts[hour] || 0,
    })).filter(d => d.orders > 0);

    // Total metrics
    const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total), 0);
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    return {
      dailySales,
      orderTypeData,
      peakTimesData,
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders: paidOrders.length,
      avgOrderValue: avgOrderValue.toFixed(2),
    };
  }, [orders, startDate, endDate]);

  const isLoading = ordersLoading || customerLoading || menuLoading;

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
            <>
              {/* Summary Cards */}
              {analyticsData && (
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
              )}

              {/* Customer Insights */}
              {customerInsights && (
                <Card className="border-border/50 mb-8">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Customer Insights
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(customerInsights.topCustomers, 'top-customers')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Total Customers</p>
                        <p className="text-2xl font-bold">{customerInsights.totalCustomers}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Repeat Customers</p>
                        <p className="text-2xl font-bold">{customerInsights.repeatCustomers}</p>
                        <p className="text-xs text-muted-foreground mt-1">{customerInsights.repeatRate}% repeat rate</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Avg Lifetime Value</p>
                        <p className="text-2xl font-bold">£{customerInsights.avgLifetimeValue}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">New Customers</p>
                        <p className="text-2xl font-bold">{customerInsights.newCustomers}</p>
                      </div>
                    </div>

                    {customerInsights.topCustomers.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Top 10 Customers</h4>
                        <div className="space-y-2">
                          {customerInsights.topCustomers.map((customer, index) => (
                            <div key={customer.email} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                                <div>
                                  <p className="font-medium">{customer.name}</p>
                                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">£{customer.total}</p>
                                <p className="text-sm text-muted-foreground">{customer.orders} orders</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Menu Performance */}
              {menuPerformance && (
                <Card className="border-border/50 mb-8">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Menu Performance
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(menuPerformance.topItems, 'top-menu-items')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Total Items Sold</p>
                        <p className="text-2xl font-bold">{menuPerformance.totalItemsSold}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Avg Items Per Order</p>
                        <p className="text-2xl font-bold">{menuPerformance.avgItemsPerOrder}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Top Items */}
                      {menuPerformance.topItems.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Top 10 Items by Revenue</h4>
                          <div className="space-y-2">
                            {menuPerformance.topItems.map((item, index) => (
                              <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                                  <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold">£{item.revenue}</p>
                                  <p className="text-xs text-muted-foreground">{item.quantity} sold</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Category Revenue */}
                      {menuPerformance.categoryRevenue.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Revenue by Category</h4>
                          <div className="space-y-2">
                            {menuPerformance.categoryRevenue.map((cat) => (
                              <div key={cat.name} className="flex items-center justify-between p-2 rounded bg-muted/30">
                                <p className="text-sm font-medium">{cat.name}</p>
                                <p className="text-sm font-bold">£{cat.revenue.toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Never Ordered Items */}
                    {menuPerformance.neverOrdered.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <h4 className="font-semibold mb-3 text-orange-500">Items Never Ordered ({menuPerformance.neverOrdered.length})</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {menuPerformance.neverOrdered.slice(0, 12).map((item) => (
                            <div key={item.id} className="text-sm p-2 rounded bg-orange-500/10">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Existing Charts */}
              {analyticsData && (
                <>
                  {/* Sales Trend */}
                  <Card className="border-border/50 mb-8">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Sales Trend</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToCSV(analyticsData.dailySales, 'daily-sales')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analyticsData.dailySales}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="date" stroke="#888" />
                          <YAxis stroke="#888" />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} name="Revenue (£)" />
                          <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} name="Orders" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                            <Bar dataKey="orders" fill="#f59e0b" name="Orders" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
