import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search, Filter, ChevronLeft, ChevronRight, Activity, Users, FileText } from "lucide-react";
import { format } from "date-fns";

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = trpc.auditLogs.getAuditLogs.useQuery({
    page,
    pageSize: 50,
    search: search || undefined,
    action: actionFilter || undefined,
    entityType: entityTypeFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: filterOptions } = trpc.auditLogs.getFilterOptions.useQuery();
  const { data: stats } = trpc.auditLogs.getAuditStats.useQuery();

  const actionColors: Record<string, string> = {
    create: "bg-green-500/10 text-green-500 border-green-500/20",
    update: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    delete: "bg-red-500/10 text-red-500 border-red-500/20",
    status_change: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    bulk_update: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  const entityTypeLabels: Record<string, string> = {
    order: "Order",
    menu_item: "Menu Item",
    menu_category: "Category",
    user: "User",
    settings: "Settings",
    reservation: "Reservation",
    email_template: "Email Template",
    sms_template: "SMS Template",
  };

  const handleReset = () => {
    setSearch("");
    setActionFilter("");
    setEntityTypeFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track all administrative actions for accountability and compliance
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLogs}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentLogs}</div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.topUsers.length}</div>
                <p className="text-xs text-muted-foreground">Contributing to logs</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>Filter audit logs by action, entity type, date range, or search</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {filterOptions?.actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace("_", " ").toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {filterOptions?.entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {entityTypeLabels[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End date"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleReset} variant="outline" size="sm">
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              {data?.logs.length || 0} logs found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
            ) : data?.logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Timestamp</th>
                        <th className="text-left p-3 font-semibold">User</th>
                        <th className="text-left p-3 font-semibold">Action</th>
                        <th className="text-left p-3 font-semibold">Entity</th>
                        <th className="text-left p-3 font-semibold">Details</th>
                        <th className="text-left p-3 font-semibold">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.logs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-sm">
                            {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm:ss")}
                          </td>
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{log.userName}</div>
                              <div className="text-xs text-muted-foreground">{log.userRole}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={actionColors[log.action] || ""}>
                              {log.action.replace("_", " ").toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{log.entityName || `ID: ${log.entityId}`}</div>
                              <div className="text-xs text-muted-foreground">
                                {entityTypeLabels[log.entityType] || log.entityType}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 max-w-xs">
                            {log.changes && Object.keys(log.changes).length > 0 ? (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-blue-500 hover:underline">
                                  View changes ({Object.keys(log.changes).length} fields)
                                </summary>
                                <div className="mt-2 space-y-1 bg-muted p-2 rounded">
                                  {Object.entries(log.changes).map(([field, change]: [string, any]) => (
                                    <div key={field}>
                                      <strong>{field}:</strong>{" "}
                                      <span className="text-red-500">{JSON.stringify(change.before)}</span>
                                      {" → "}
                                      <span className="text-green-500">{JSON.stringify(change.after)}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ) : (
                              <span className="text-muted-foreground">No changes tracked</span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {log.ipAddress || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!data?.pagination.hasMore}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
