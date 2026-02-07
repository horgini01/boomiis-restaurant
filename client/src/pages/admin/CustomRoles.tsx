import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Shield, 
  CheckCircle2,
  XCircle 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AdminLayout from "@/components/AdminLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CustomRoles() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch custom roles
  const { data: roles, refetch } = trpc.customRoles.getAllCustomRoles.useQuery();
  
  // Fetch available routes for permission selection
  const { data: availableRoutes } = trpc.customRoles.getAvailableRoutes.useQuery();

  // Mutations
  const createRole = trpc.customRoles.createCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Custom role created successfully");
      setIsCreateDialogOpen(false);
      setSelectedPermissions([]);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create role");
    },
  });

  const updateRole = trpc.customRoles.updateCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Custom role updated successfully");
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  const deleteRole = trpc.customRoles.deleteCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Custom role deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete role");
    },
  });

  const handleCreateRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (selectedPermissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    createRole.mutate({
      roleName: formData.get("roleName") as string,
      description: formData.get("description") as string || undefined,
      permissions: selectedPermissions,
    });
  };

  const handleEditRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (selectedPermissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    updateRole.mutate({
      id: selectedRole.id,
      roleName: formData.get("roleName") as string,
      description: formData.get("description") as string || undefined,
      permissions: selectedPermissions,
    });
  };

  const handleDeleteRole = (roleId: number) => {
    if (confirm("Are you sure you want to delete this role? Users assigned to this role will lose access.")) {
      deleteRole.mutate({ id: roleId });
    }
  };

  const handleEditClick = (role: any) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions || []);
    setIsEditDialogOpen(true);
  };

  const handleTogglePermission = (route: string) => {
    setSelectedPermissions(prev =>
      prev.includes(route)
        ? prev.filter(r => r !== route)
        : [...prev, route]
    );
  };

  const handleSelectAllInCategory = (category: any) => {
    const categoryRoutes = category.routes.map((r: any) => r.route);
    const allSelected = categoryRoutes.every((route: string) => selectedPermissions.includes(route));
    
    if (allSelected) {
      // Deselect all in category
      setSelectedPermissions(prev => prev.filter(r => !categoryRoutes.includes(r)));
    } else {
      // Select all in category
      setSelectedPermissions(prev => {
        const newPerms = [...prev];
        categoryRoutes.forEach((route: string) => {
          if (!newPerms.includes(route)) {
            newPerms.push(route);
          }
        });
        return newPerms;
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Custom Roles</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage custom roles with granular permissions
            </p>
          </div>
          <Button onClick={() => {
            setSelectedPermissions([]);
            setIsCreateDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </div>

        {/* Roles Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      {role.roleName}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {role.description || "No description"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {role.permissions?.length || 0} permissions
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {role.isActive ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="mr-1 h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(role.createdAt), "MMM d, yyyy")}
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
                        <DropdownMenuItem onClick={() => handleEditClick(role)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!roles || roles.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No custom roles yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create Role Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create Custom Role</DialogTitle>
              <DialogDescription>
                Define a new role with specific permissions for your team members.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRole}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="roleName">Role Name *</Label>
                  <Input
                    id="roleName"
                    name="roleName"
                    placeholder="e.g., Weekend Manager"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe what this role is for..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="mb-3 block">Permissions *</Label>
                  <ScrollArea className="h-[400px] border rounded-lg p-4">
                    <div className="space-y-6">
                      {availableRoutes?.map((category) => (
                        <div key={category.category} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">{category.category}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectAllInCategory(category)}
                            >
                              {category.routes.every((r: any) => selectedPermissions.includes(r.route))
                                ? "Deselect All"
                                : "Select All"}
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {category.routes.map((route: any) => (
                              <div key={route.route} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`create-${route.route}`}
                                  checked={selectedPermissions.includes(route.route)}
                                  onCheckedChange={() => handleTogglePermission(route.route)}
                                />
                                <label
                                  htmlFor={`create-${route.route}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {route.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedPermissions.length} permission(s) selected
                  </p>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createRole.isPending}>
                  {createRole.isPending ? "Creating..." : "Create Role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Edit Custom Role</DialogTitle>
              <DialogDescription>
                Update role details and permissions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditRole}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-roleName">Role Name *</Label>
                  <Input
                    id="edit-roleName"
                    name="roleName"
                    defaultValue={selectedRole?.roleName}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={selectedRole?.description || ""}
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="mb-3 block">Permissions *</Label>
                  <ScrollArea className="h-[400px] border rounded-lg p-4">
                    <div className="space-y-6">
                      {availableRoutes?.map((category) => (
                        <div key={category.category} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">{category.category}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectAllInCategory(category)}
                            >
                              {category.routes.every((r: any) => selectedPermissions.includes(r.route))
                                ? "Deselect All"
                                : "Select All"}
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {category.routes.map((route: any) => (
                              <div key={route.route} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`edit-${route.route}`}
                                  checked={selectedPermissions.includes(route.route)}
                                  onCheckedChange={() => handleTogglePermission(route.route)}
                                />
                                <label
                                  htmlFor={`edit-${route.route}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {route.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedPermissions.length} permission(s) selected
                  </p>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateRole.isPending}>
                  {updateRole.isPending ? "Updating..." : "Update Role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
