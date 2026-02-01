import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export function DeliveryAreasSettings() {
  const utils = trpc.useUtils();
  
  const { data: areas = [], isLoading } = trpc.admin.getDeliveryAreas.useQuery();
  const saveAreaMutation = trpc.admin.saveDeliveryArea.useMutation({
    onSuccess: () => {
      utils.admin.getDeliveryAreas.invalidate();
      toast.success('Delivery area saved successfully');
      setNewArea({ areaName: '', postcodesPrefixes: '' });
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });
  
  const deleteAreaMutation = trpc.admin.deleteDeliveryArea.useMutation({
    onSuccess: () => {
      utils.admin.getDeliveryAreas.invalidate();
      toast.success('Delivery area deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const [newArea, setNewArea] = useState({
    areaName: '',
    postcodesPrefixes: '',
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingArea, setEditingArea] = useState({
    areaName: '',
    postcodesPrefixes: '',
  });

  const handleAddArea = () => {
    if (!newArea.areaName.trim() || !newArea.postcodesPrefixes.trim()) {
      toast.error('Please fill in both area name and postcode prefixes');
      return;
    }

    saveAreaMutation.mutate({
      areaName: newArea.areaName.trim(),
      postcodesPrefixes: newArea.postcodesPrefixes.trim(),
      displayOrder: areas.length,
    });
  };

  const handleUpdateArea = (id: number) => {
    if (!editingArea.areaName.trim() || !editingArea.postcodesPrefixes.trim()) {
      toast.error('Please fill in both area name and postcode prefixes');
      return;
    }

    const area = areas.find(a => a.id === id);
    if (!area) return;

    saveAreaMutation.mutate({
      id,
      areaName: editingArea.areaName.trim(),
      postcodesPrefixes: editingArea.postcodesPrefixes.trim(),
      displayOrder: area.displayOrder,
    });
    setEditingId(null);
  };

  const handleDeleteArea = (id: number) => {
    if (confirm('Are you sure you want to delete this delivery area?')) {
      deleteAreaMutation.mutate({ id });
    }
  };

  const handleMoveUp = (id: number, currentOrder: number) => {
    if (currentOrder === 0) return;
    
    const area = areas.find(a => a.id === id);
    if (!area) return;

    saveAreaMutation.mutate({
      id,
      areaName: area.areaName,
      postcodesPrefixes: area.postcodesPrefixes,
      displayOrder: currentOrder - 1,
    });
  };

  const handleMoveDown = (id: number, currentOrder: number) => {
    if (currentOrder === areas.length - 1) return;
    
    const area = areas.find(a => a.id === id);
    if (!area) return;

    saveAreaMutation.mutate({
      id,
      areaName: area.areaName,
      postcodesPrefixes: area.postcodesPrefixes,
      displayOrder: currentOrder + 1,
    });
  };

  const startEditing = (area: typeof areas[0]) => {
    setEditingId(area.id);
    setEditingArea({
      areaName: area.areaName,
      postcodesPrefixes: area.postcodesPrefixes,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading delivery areas...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Delivery Coverage Areas
          </CardTitle>
          <CardDescription>
            Manage the areas where you offer delivery service. Add area names with their postcode prefixes for validation during checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Area Form */}
          <div className="space-y-4 p-4 border border-dashed rounded-lg bg-muted/30">
            <h3 className="font-semibold text-sm">Add New Delivery Area</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-area-name">Area Name</Label>
                <Input
                  id="new-area-name"
                  placeholder="e.g., Westminster"
                  value={newArea.areaName}
                  onChange={(e) => setNewArea({ ...newArea, areaName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-postcodes">Postcode Prefixes (comma-separated)</Label>
                <Input
                  id="new-postcodes"
                  placeholder="e.g., SW1, SW7, SW10"
                  value={newArea.postcodesPrefixes}
                  onChange={(e) => setNewArea({ ...newArea, postcodesPrefixes: e.target.value })}
                />
              </div>
            </div>
            <Button
              onClick={handleAddArea}
              disabled={saveAreaMutation.isPending}
              className="w-full md:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Delivery Area
            </Button>
          </div>

          {/* Existing Areas List */}
          {areas.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Configured Delivery Areas</h3>
              {areas.map((area, index) => (
                <Card key={area.id} className="border-l-4 border-l-primary/50">
                  <CardContent className="p-4">
                    {editingId === area.id ? (
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label htmlFor={`edit-area-${area.id}`}>Area Name</Label>
                            <Input
                              id={`edit-area-${area.id}`}
                              value={editingArea.areaName}
                              onChange={(e) => setEditingArea({ ...editingArea, areaName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`edit-postcodes-${area.id}`}>Postcode Prefixes</Label>
                            <Input
                              id={`edit-postcodes-${area.id}`}
                              value={editingArea.postcodesPrefixes}
                              onChange={(e) => setEditingArea({ ...editingArea, postcodesPrefixes: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateArea(area.id)}
                            disabled={saveAreaMutation.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-semibold text-base">{area.areaName}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Postcodes: {area.postcodesPrefixes}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveUp(area.id, index)}
                              disabled={index === 0 || saveAreaMutation.isPending}
                              className="h-6 w-6 p-0"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveDown(area.id, index)}
                              disabled={index === areas.length - 1 || saveAreaMutation.isPending}
                              className="h-6 w-6 p-0"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(area)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteArea(area.id)}
                            disabled={deleteAreaMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No delivery areas configured yet. Add your first area above.
            </div>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">How It Works</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <strong>Area Name:</strong> The display name for the delivery area (e.g., "Westminster", "Camden")</li>
              <li>• <strong>Postcode Prefixes:</strong> Comma-separated list of postcode prefixes covered (e.g., "SW1, SW7, SW10")</li>
              <li>• During checkout, customer postcodes are validated against these prefixes</li>
              <li>• Areas appear on website footer, emails, and PDF receipts</li>
              <li>• Use the arrows to reorder how areas are displayed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
