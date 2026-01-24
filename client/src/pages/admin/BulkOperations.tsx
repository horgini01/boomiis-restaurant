import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function BulkOperations() {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [priceChange, setPriceChange] = useState('');

  const utils = trpc.useUtils();
  const { data: menuItems, isLoading } = trpc.admin.getMenuItems.useQuery();

  const bulkUpdatePricesMutation = trpc.admin.bulkUpdatePrices.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated prices for ${data.updatedCount} items`);
      setPriceChange('');
      setSelectedItems([]);
      utils.admin.getMenuItems.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update prices');
    },
  });

  const bulkToggleAvailabilityMutation = trpc.admin.bulkToggleAvailability.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated availability for ${data.updatedCount} items`);
      setSelectedItems([]);
      utils.admin.getMenuItems.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update availability');
    },
  });

  const duplicateMenuItemMutation = trpc.admin.duplicateMenuItem.useMutation({
    onSuccess: () => {
      toast.success('Menu item duplicated successfully');
      utils.admin.getMenuItems.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to duplicate menu item');
    },
  });

  const handleBulkPriceUpdate = () => {
    if (!priceChange || selectedItems.length === 0) {
      toast.error('Please select items and enter a price change percentage');
      return;
    }

    bulkUpdatePricesMutation.mutate({
      itemIds: selectedItems,
      priceChange: parseFloat(priceChange),
    });
  };

  const handleBulkToggleAvailability = (isAvailable: boolean) => {
    if (selectedItems.length === 0) {
      toast.error('Please select items first');
      return;
    }

    bulkToggleAvailabilityMutation.mutate({
      itemIds: selectedItems,
      isAvailable,
    });
  };

  const handleDuplicate = (id: number) => {
    duplicateMenuItemMutation.mutate({ id });
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === menuItems?.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(menuItems?.map((item: any) => item.id) || []);
    }
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div>
          <h1 className="text-4xl font-bold mb-8">Bulk Operations</h1>

          {/* Bulk Actions Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Bulk Price Update</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="priceChange">Price Change (%)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="priceChange"
                    type="number"
                    placeholder="e.g., 10 for 10% increase, -5 for 5% decrease"
                    value={priceChange}
                    onChange={(e) => setPriceChange(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleBulkPriceUpdate}
                    disabled={!priceChange || selectedItems.length === 0 || bulkUpdatePricesMutation.isPending}
                  >
                    {bulkUpdatePricesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Update ${selectedItems.length} Items`
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Selected {selectedItems.length} item(s). Enter a positive number to increase prices or negative to decrease.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleBulkToggleAvailability(true)}
                  disabled={selectedItems.length === 0 || bulkToggleAvailabilityMutation.isPending}
                >
                  Make Available
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBulkToggleAvailability(false)}
                  disabled={selectedItems.length === 0 || bulkToggleAvailabilityMutation.isPending}
                >
                  Make Unavailable
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedItems([])}
                  disabled={selectedItems.length === 0}
                >
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Menu Items Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Select Menu Items</CardTitle>
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedItems.length === menuItems?.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {menuItems?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems([...selectedItems, item.id]);
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== item.id));
                            }
                          }}
                        />
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            £{item.price} • {item.isAvailable ? 'Available' : 'Unavailable'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(item.id)}
                        disabled={duplicateMenuItemMutation.isPending}
                      >
                        Duplicate
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
