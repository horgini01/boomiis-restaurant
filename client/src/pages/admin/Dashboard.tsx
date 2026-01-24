import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Loader2, UtensilsCrossed, ShoppingBag, CalendarCheck, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();

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
              {/* Stats Cards */}
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
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a
                      href="/admin/menu-items"
                      className="p-4 rounded-lg border border-border hover:border-primary transition-colors"
                    >
                      <UtensilsCrossed className="h-6 w-6 text-primary mb-2" />
                      <h3 className="font-semibold mb-1">Manage Menu</h3>
                      <p className="text-sm text-muted-foreground">Add or edit menu items</p>
                    </a>
                    <a
                      href="/admin/orders"
                      className="p-4 rounded-lg border border-border hover:border-primary transition-colors"
                    >
                      <ShoppingBag className="h-6 w-6 text-primary mb-2" />
                      <h3 className="font-semibold mb-1">View Orders</h3>
                      <p className="text-sm text-muted-foreground">Manage customer orders</p>
                    </a>
                    <a
                      href="/admin/reservations"
                      className="p-4 rounded-lg border border-border hover:border-primary transition-colors"
                    >
                      <CalendarCheck className="h-6 w-6 text-primary mb-2" />
                      <h3 className="font-semibold mb-1">Reservations</h3>
                      <p className="text-sm text-muted-foreground">Manage table bookings</p>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
