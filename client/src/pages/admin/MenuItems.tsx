import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, Star, Upload, Package, PackageX } from 'lucide-react';

export default function MenuItemsManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    slug: '',
    description: '',
    price: '',
    imageUrl: '',
    isVegan: false,
    isGlutenFree: false,
    isHalal: false,
    allergens: '',
    isAvailable: true,
    isFeatured: false,
    prepTimeMinutes: 15,
    displayOrder: 0,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const utils = trpc.useUtils();
  const { data: categories } = trpc.menu.categories.useQuery();
  const { data: menuItems, isLoading } = trpc.admin.getMenuItems.useQuery();

  const createMutation = trpc.admin.createMenuItem.useMutation({
    onSuccess: () => {
      toast.success('Menu item created successfully');
      utils.admin.getMenuItems.invalidate();
      utils.menu.featured.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create menu item');
    },
  });

  const updateMutation = trpc.admin.updateMenuItem.useMutation({
    onSuccess: () => {
      toast.success('Menu item updated successfully');
      utils.admin.getMenuItems.invalidate();
      utils.menu.featured.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update menu item');
    },
  });

  const deleteMutation = trpc.admin.deleteMenuItem.useMutation({
    onSuccess: () => {
      toast.success('Menu item deleted successfully');
      utils.admin.getMenuItems.invalidate();
      utils.menu.featured.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete menu item');
    },
  });

  const toggleAvailableMutation = trpc.admin.toggleMenuItemAvailable.useMutation({
    onSuccess: () => {
      toast.success('Menu item status updated');
      utils.admin.getMenuItems.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update menu item');
    },
  });

  const toggleStockMutation = trpc.admin.toggleMenuItemStock.useMutation({
    onSuccess: () => {
      toast.success('Stock status updated');
      utils.admin.getMenuItems.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update stock status');
    },
  });

  const resetForm = () => {
    setFormData({
      categoryId: '',
      name: '',
      slug: '',
      description: '',
      price: '',
      imageUrl: '',
      isVegan: false,
      isGlutenFree: false,
      isHalal: false,
      allergens: '',
      isAvailable: true,
      isFeatured: false,
      prepTimeMinutes: 15,
      displayOrder: 0,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      categoryId: item.categoryId.toString(),
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      price: item.price,
      imageUrl: item.imageUrl || '',
      isVegan: item.isVegan,
      isGlutenFree: item.isGlutenFree,
      isHalal: item.isHalal,
      allergens: item.allergens || '',
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      prepTimeMinutes: item.prepTimeMinutes || 15,
      displayOrder: item.displayOrder,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      categoryId: parseInt(formData.categoryId),
      price: parseFloat(formData.price),
    };

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        ...data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this menu item? This action cannot be undone.')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggleAvailable = (id: number, currentStatus: boolean) => {
    toggleAvailableMutation.mutate({ id, isAvailable: !currentStatus });
  };

  const handleToggleStock = (id: number, currentStatus: boolean) => {
    toggleStockMutation.mutate({ id, outOfStock: !currentStatus });
  };

  const getCategoryName = (categoryId: number) => {
    return categories?.find((c: any) => c.id === categoryId)?.name || 'Unknown';
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">Menu Items</h1>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Menu Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category: any) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="name">Item Name *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                          setFormData({ ...formData, name, slug });
                        }}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="slug">Slug *</Label>
                      <Input
                        id="slug"
                        required
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="price">Price (£) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="prepTimeMinutes">Prep Time (minutes) *</Label>
                      <Input
                        id="prepTimeMinutes"
                        type="number"
                        min="1"
                        required
                        value={formData.prepTimeMinutes}
                        onChange={(e) => setFormData({ ...formData, prepTimeMinutes: parseInt(e.target.value) || 15 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Estimated kitchen preparation time</p>
                    </div>

                    <div>
                      <Label htmlFor="displayOrder">Display Order</Label>
                      <Input
                        id="displayOrder"
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="imageUrl">Image</Label>
                      <div className="flex gap-2">
                        <Input
                          id="imageUrl"
                          type="url"
                          placeholder="Image URL or upload below"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          disabled={uploadingImage}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('image-upload')?.click()}
                          disabled={uploadingImage}
                          className="min-w-[100px]"
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload
                            </>
                          )}
                        </Button>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            setUploadingImage(true);
                            
                            try {
                              const reader = new FileReader();
                              reader.onload = async (event) => {
                                try {
                                  const base64 = event.target?.result as string;
                                  const response = await fetch('/api/trpc/admin.uploadImage', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      json: {
                                        file: base64,
                                        fileName: file.name,
                                        mimeType: file.type || 'image/jpeg',
                                      },
                                    }),
                                  });
                                  
                                  if (!response.ok) {
                                    throw new Error(`Upload failed: ${response.statusText}`);
                                  }
                                  
                                  const data = await response.json();
                                  console.log('Upload response:', data);
                                  
                                  if (data.result?.data?.json?.url) {
                                    setFormData((prev) => ({ ...prev, imageUrl: data.result.data.json.url }));
                                    toast.success('Image uploaded successfully');
                                  } else {
                                    throw new Error('Invalid response format');
                                  }
                                } catch (error: any) {
                                  console.error('Upload error:', error);
                                  toast.error(error.message || 'Failed to upload image');
                                } finally {
                                  setUploadingImage(false);
                                }
                              };
                              
                              reader.onerror = () => {
                                toast.error('Failed to read file');
                                setUploadingImage(false);
                              };
                              
                              reader.readAsDataURL(file);
                            } catch (error: any) {
                              console.error('File read error:', error);
                              toast.error('Failed to process image');
                              setUploadingImage(false);
                            }
                          }}
                        />
                      </div>
                      {uploadingImage && (
                        <div className="mt-2 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <div>
                            <p className="text-sm font-medium">Uploading image...</p>
                            <p className="text-xs text-muted-foreground">Please wait while we upload your image to storage</p>
                          </div>
                        </div>
                      )}
                      {formData.imageUrl && !uploadingImage && (
                        <div className="mt-2">
                          <img
                            src={formData.imageUrl}
                            alt="Preview"
                            className="h-32 w-32 object-cover rounded-lg border-2 border-primary/20"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Image preview</p>
                        </div>
                      )}
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="allergens">Allergens (comma-separated)</Label>
                      <Input
                        id="allergens"
                        placeholder="e.g., Nuts, Dairy, Gluten"
                        value={formData.allergens}
                        onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                      />
                    </div>

                    <div className="col-span-2 space-y-3">
                      <Label>Dietary Information</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isVegan"
                          checked={formData.isVegan}
                          onCheckedChange={(checked) => setFormData({ ...formData, isVegan: !!checked })}
                        />
                        <Label htmlFor="isVegan" className="cursor-pointer">Vegan</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isGlutenFree"
                          checked={formData.isGlutenFree}
                          onCheckedChange={(checked) => setFormData({ ...formData, isGlutenFree: !!checked })}
                        />
                        <Label htmlFor="isGlutenFree" className="cursor-pointer">Gluten-Free</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isHalal"
                          checked={formData.isHalal}
                          onCheckedChange={(checked) => setFormData({ ...formData, isHalal: !!checked })}
                        />
                        <Label htmlFor="isHalal" className="cursor-pointer">Halal</Label>
                      </div>
                    </div>

                    <div className="col-span-2 space-y-3">
                      <Label>Status</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isAvailable"
                          checked={formData.isAvailable}
                          onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: !!checked })}
                        />
                        <Label htmlFor="isAvailable" className="cursor-pointer">Available</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isFeatured"
                          checked={formData.isFeatured}
                          onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: !!checked })}
                        />
                        <Label htmlFor="isFeatured" className="cursor-pointer">Featured on Homepage</Label>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingItem ? 'Update Menu Item' : 'Create Menu Item'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Dietary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.isFeatured && <Star className="h-4 w-4 text-primary fill-primary" />}
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getCategoryName(item.categoryId)}
                        </TableCell>
                        <TableCell className="font-medium">£{parseFloat(item.price).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {item.isVegan && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">V</span>
                            )}
                            {item.isGlutenFree && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">GF</span>
                            )}
                            {item.isHalal && (
                              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-500">H</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.isAvailable
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-gray-500/10 text-gray-500'
                            }`}
                          >
                            {item.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleAvailable(item.id, item.isAvailable)}
                              title={item.isAvailable ? 'Hide from menu' : 'Show on menu'}
                            >
                              {item.isAvailable ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStock(item.id, item.outOfStock)}
                              title={item.outOfStock ? 'Mark in stock' : 'Mark out of stock'}
                              className={item.outOfStock ? 'text-orange-500' : ''}
                            >
                              {item.outOfStock ? (
                                <PackageX className="h-4 w-4" />
                              ) : (
                                <Package className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
