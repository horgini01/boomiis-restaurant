import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, UserPlus, MoreVertical, Shield, Users, ChefHat, UserCog, Eye, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import AdminLayout from "@/components/AdminLayout";

type Role = "owner" | "admin" | "manager" | "kitchen_staff" | "front_desk";
type Status = "active" | "inactive";

const roleIcons = {
  owner: Shield,
  admin: UserCog,
  manager: Users,
  kitchen_staff: ChefHat,
  front_desk: Users,
};

const roleLabels = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  kitchen_staff: "Kitchen Staff",
  front_desk: "Front Desk",
};

const roleColors = {
  owner: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  manager: "bg-green-100 text-green-800",
  kitchen_staff: "bg-orange-100 text-orange-800",
  front_desk: "bg-cyan-100 text-cyan-800",
};

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // Fetch users
  const { data: users, refetch } = trpc.adminUsers.getAdminUsers.useQuery({
    search: searchTerm || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  // Fetch custom roles for role selection
  const { data: customRoles } = trpc.customRoles.getAllCustomRoles.useQuery();

  // Mutations
  const createUser = trpc.adminUsers.addAdminUser.useMutation({
    onSuccess: () => {
      toast.success("Admin user created successfully!");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create user");
    },
  });

  const updateUser = trpc.adminUsers.updateAdminUser.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user");
    },
  });

  const updateStatus = trpc.adminUsers.updateAdminStatus.useMutation({
    onSuccess: () => {
      toast.success("User status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const deleteUser = trpc.adminUsers.deleteAdminUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });

  const bulkUpdateStatus = trpc.adminUsers.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedUserIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update users");
    },
  });

  const bulkDeleteUsers = trpc.adminUsers.bulkDeleteUsers.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedUserIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete users");
    },
  });

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createUser.mutate({
      email: formData.get("email") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      role: formData.get("role") as "admin" | "manager" | "kitchen_staff" | "front_desk",
      phone: formData.get("phone") as string || undefined,
    });
  };

  const handleEditUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateUser.mutate({
      id: selectedUser.id,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      role: formData.get("role") as "admin" | "manager" | "kitchen_staff" | "front_desk",
      phone: formData.get("phone") as string || undefined,
    });
  };

  const handleToggleStatus = (userId: number, currentStatus: Status) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    updateStatus.mutate({ id: userId, status: newStatus });
  };

  const handleDeleteUser = (userId: number) => {
    if (confirm("⚠️ WARNING: This will permanently delete this user from the database. This action cannot be undone. Are you sure you want to continue?")) {
      deleteUser.mutate({ id: userId });
    }
  };

  const handleBulkActivate = () => {
    if (selectedUserIds.length === 0) return;
    bulkUpdateStatus.mutate({ userIds: selectedUserIds, status: "active" });
  };

  const handleBulkDeactivate = () => {
    if (selectedUserIds.length === 0) return;
    if (confirm(`Are you sure you want to deactivate ${selectedUserIds.length} user(s)?`)) {
      bulkUpdateStatus.mutate({ userIds: selectedUserIds, status: "inactive" });
    }
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedUserIds.length} user(s)? This action cannot be undone.`)) {
      bulkDeleteUsers.mutate({ userIds: selectedUserIds });
    }
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === users?.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users?.map(u => u.id) || []);
    }
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage staff accounts and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/role-permissions">
              <Eye className="mr-2 h-4 w-4" />
              View Permissions
            </Link>
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Admin User
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedUserIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-900">
              {selectedUserIds.length} user(s) selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkActivate}
              disabled={bulkUpdateStatus.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Activate
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkDeactivate}
              disabled={bulkUpdateStatus.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Deactivate
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteUsers.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as Role | "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="kitchen_staff">Kitchen Staff</SelectItem>
            <SelectItem value="front_desk">Front Desk</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as Status | "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedUserIds.length === users?.length && users.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => {
              const RoleIcon = roleIcons[user.role as Role];
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={() => handleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div>{user.name}</div>
                      {user.firstName && user.lastName && (
                        <div className="text-sm text-muted-foreground">
                          {user.firstName} {user.lastName}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.customRoleId && customRoles ? (
                      <Badge className="bg-indigo-100 text-indigo-800">
                        <Shield className="h-3 w-3 mr-1" />
                        {customRoles.find(r => r.id === user.customRoleId)?.roleName || "Custom Role"}
                      </Badge>
                    ) : (
                      <Badge className={roleColors[user.role as Role]}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleLabels[user.role as Role]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : "secondary"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastSignedIn
                      ? format(new Date(user.lastSignedIn), "MMM d, yyyy h:mm a")
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(user.id, user.status as Status)}
                        >
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600"
                        >
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>
              Create a new admin user account. User will set their password via /admin/setup.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" name="lastName" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="kitchen_staff">Kitchen Staff</SelectItem>
                    <SelectItem value="front_desk">Front Desk</SelectItem>
                    {customRoles && customRoles.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Custom Roles</div>
                        {customRoles.map((role) => (
                          <SelectItem key={`custom-${role.id}`} value={`custom-${role.id}`}>
                            {role.roleName}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? "Creating..." : "Create Admin User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details and role assignment.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUser}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstName">First Name</Label>
                    <Input
                      id="edit-firstName"
                      name="firstName"
                      defaultValue={selectedUser.firstName || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-lastName">Last Name</Label>
                    <Input
                      id="edit-lastName"
                      name="lastName"
                      defaultValue={selectedUser.lastName || ""}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    name="phone"
                    type="tel"
                    defaultValue={selectedUser.phone || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select 
                    name="role" 
                    defaultValue={selectedUser.customRoleId ? `custom-${selectedUser.customRoleId}` : selectedUser.role}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="kitchen_staff">Kitchen Staff</SelectItem>
                      <SelectItem value="front_desk">Front Desk</SelectItem>
                      {customRoles && customRoles.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Custom Roles</div>
                          {customRoles.map((role) => (
                            <SelectItem key={`custom-${role.id}`} value={`custom-${role.id}`}>
                              {role.roleName}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
}
