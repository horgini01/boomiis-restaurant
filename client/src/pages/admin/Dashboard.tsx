import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Loader2, UtensilsCrossed, ShoppingBag, CalendarCheck, TrendingUp, ChefHat, AlertCircle, Bell, Activity, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'wouter';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.admin.statsWithTrends.useQuery();
  const { data: snapshot, isLoading: snapshotLoading } = trpc.admin.todaySnapshot.useQuery();
  const { data: alerts, isLoading: alertsLoading } = trpc.admin.alerts.useQuery();
  const { data: activity, isLoading: activityLoading, refetch: refetchActivity } = trpc.admin.recentActivity.useQuery();

  // Auto-refresh activity feed every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchActivity();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchActivity]);

  const isLoading = statsLoading || snapshotLoading || alertsLoading || activityLoading;

  const getTrendIcon = (value: string) => {
    const num = parseFloat(value);
    if (num > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (num < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getTrendColor = (value: string) => {
    const num = parseFloat(value);
    if (num > 0) return 'text-green-500';
    if (num < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div>
          <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Today's Snapshot */}
              {snapshot && (
                <Card className="border-border/50 mb-6 bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Today's Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                        <p className="text-3xl font-bold">£{snapshot.today.revenue}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getTrendIcon(snapshot.changes.revenue)}
                          <span className={`text-sm font-medium ${getTrendColor(snapshot.changes.revenue)}`}>
                            {snapshot.changes.revenue}% vs yesterday
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Orders</p>
                        <p className="text-3xl font-bold">{snapshot.today.orders}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getTrendIcon(snapshot.changes.orders)}
                          <span className={`text-sm font-medium ${getTrendColor(snapshot.changes.orders)}`}>
                            {snapshot.changes.orders}% vs yesterday
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Reservations</p>
                        <p className="text-3xl font-bold">{snapshot.today.reservations}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getTrendIcon(snapshot.changes.reservations)}
                          <span className={`text-sm font-medium ${getTrendColor(snapshot.changes.reservations)}`}>
                            {snapshot.changes.reservations}% vs yesterday
                          </span>
                        </div>
                      </div>
                    </div>

                    {snapshot.upcomingReservations.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <p className="text-sm font-medium mb-3">Upcoming Reservations (Next 2 Hours)</p>
                        <div className="space-y-2">
                          {snapshot.upcomingReservations.map((res) => (
                            <div key={res.id} className="flex items-center justify-between text-sm">
                              <span>{res.customerName} - Party of {res.partySize}</span>
                              <span className="text-muted-foreground">
                                {format(new Date(res.reservationDate), 'h:mm a')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Alerts & Action Items */}
              {alerts && (alerts.pendingTestimonials > 0 || alerts.unconfirmedReservations > 0) && (
                <Card className="border-orange-500/50 bg-orange-500/10 mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-500">
                      <Bell className="h-5 w-5" />
                      Alerts & Action Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {alerts.pendingTestimonials > 0 && (
                        <Link href="/admin/testimonials">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background cursor-pointer transition-colors">
                            <div className="flex items-center gap-3">
                              <AlertCircle className="h-5 w-5 text-orange-500" />
                              <span className="font-medium">{alerts.pendingTestimonials} testimonial{alerts.pendingTestimonials > 1 ? 's' : ''} awaiting approval</span>
                            </div>
                            <span className="text-sm text-muted-foreground">Review now →</span>
                          </div>
                        </Link>
                      )}
                      {alerts.unconfirmedReservations > 0 && (
                        <Link href="/admin/reservations">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background cursor-pointer transition-colors">
                            <div className="flex items-center gap-3">
                              <AlertCircle className="h-5 w-5 text-orange-500" />
                              <span className="font-medium">{alerts.unconfirmedReservations} unconfirmed reservation{alerts.unconfirmedReservations > 1 ? 's' : ''} from last 24h</span>
                            </div>
                            <span className="text-sm text-muted-foreground">Confirm now →</span>
                          </div>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats Cards with Trends */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Menu Items
                    </CardTitle>
                    <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats?.menuItemsCount || 0}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Orders
                    </CardTitle>
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats?.pendingOrdersCount || 0}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Reservations
                    </CardTitle>
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats?.pendingReservationsCount || 0}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Revenue
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">£{stats?.totalRevenue || '0.00'}</div>
                    {stats?.trends && (
                      <div className="flex items-center gap-2 mt-2">
                        {getTrendIcon(stats.trends.revenue)}
                        <span className={`text-sm font-medium ${getTrendColor(stats.trends.revenue)}`}>
                          {stats.trends.revenue}% vs last week
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity Feed */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">Auto-refreshes every 30s</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activity && activity.length > 0 ? (
                      <div className="space-y-3">
                        {activity.map((item, index) => (
                          <div key={`${item.type}-${item.id}-${index}`} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                            <div className="mt-1">
                              {item.type === 'order' && <ShoppingBag className="h-4 w-4 text-primary" />}
                              {item.type === 'reservation' && <CalendarCheck className="h-4 w-4 text-blue-500" />}
                              {item.type === 'testimonial' && <Bell className="h-4 w-4 text-green-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{item.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Link href="/admin/menu-items">
                        <div className="p-4 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer">
                          <UtensilsCrossed className="h-6 w-6 text-primary mb-2" />
                          <h3 className="font-semibold mb-1">Manage Menu</h3>
                          <p className="text-sm text-muted-foreground">Add or edit menu items</p>
                        </div>
                      </Link>
                      <Link href="/admin/orders">
                        <div className="p-4 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer">
                          <ShoppingBag className="h-6 w-6 text-primary mb-2" />
                          <h3 className="font-semibold mb-1">View Orders</h3>
                          <p className="text-sm text-muted-foreground">Manage customer orders</p>
                        </div>
                      </Link>
                      <Link href="/admin/reservations">
                        <div className="p-4 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer">
                          <CalendarCheck className="h-6 w-6 text-primary mb-2" />
                          <h3 className="font-semibold mb-1">Reservations</h3>
                          <p className="text-sm text-muted-foreground">Manage table bookings</p>
                        </div>
                      </Link>
                      <a
                        href="/kitchen"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 rounded-lg border border-orange-500/50 bg-orange-500/10 hover:border-orange-500 transition-colors"
                      >
                        <ChefHat className="h-6 w-6 text-orange-500 mb-2" />
                        <h3 className="font-semibold mb-1">Kitchen Display</h3>
                        <p className="text-sm text-muted-foreground">Open kitchen view (new tab)</p>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
