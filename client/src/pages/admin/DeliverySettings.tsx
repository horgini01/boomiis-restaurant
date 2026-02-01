import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

export default function DeliverySettings() {
  const { data: settings, isLoading, refetch } = trpc.admin.getSettings.useQuery();
  const updateSetting = trpc.admin.updateSetting.useMutation({
    onSuccess: () => {
      toast.success('Delivery settings updated successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const [prepBuffer, setPrepBuffer] = useState('10');
  const [deliveryTime, setDeliveryTime] = useState('30');
  const [deliveryFee, setDeliveryFee] = useState('3.99');
  const [minOrderFreeDelivery, setMinOrderFreeDelivery] = useState('25');
  const [isSaving, setIsSaving] = useState(false);

  // Load settings
  useEffect(() => {
    if (settings) {
      const prepBufferSetting = settings.find((s) => s.settingKey === 'prep_buffer_minutes');
      const deliveryTimeSetting = settings.find((s) => s.settingKey === 'average_delivery_time_minutes');
      const deliveryFeeSetting = settings.find((s) => s.settingKey === 'delivery_fee');
      const minOrderSetting = settings.find((s) => s.settingKey === 'min_order_free_delivery');

      if (prepBufferSetting) setPrepBuffer(prepBufferSetting.settingValue);
      if (deliveryTimeSetting) setDeliveryTime(deliveryTimeSetting.settingValue);
      if (deliveryFeeSetting) setDeliveryFee(deliveryFeeSetting.settingValue);
      if (minOrderSetting) setMinOrderFreeDelivery(minOrderSetting.settingValue);
    }
  }, [settings]);

  const handleSave = async () => {
    // Validation
    if (!prepBuffer || isNaN(Number(prepBuffer)) || Number(prepBuffer) < 0) {
      toast.error('Prep buffer must be a valid number');
      return;
    }
    if (!deliveryTime || isNaN(Number(deliveryTime)) || Number(deliveryTime) < 0) {
      toast.error('Delivery time must be a valid number');
      return;
    }
    if (!deliveryFee || isNaN(Number(deliveryFee)) || Number(deliveryFee) < 0) {
      toast.error('Delivery fee must be a valid number');
      return;
    }
    if (minOrderFreeDelivery && (isNaN(Number(minOrderFreeDelivery)) || Number(minOrderFreeDelivery) < 0)) {
      toast.error('Minimum order must be a valid number');
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ settingKey: 'prep_buffer_minutes', settingValue: prepBuffer }),
        updateSetting.mutateAsync({ settingKey: 'average_delivery_time_minutes', settingValue: deliveryTime }),
        updateSetting.mutateAsync({ settingKey: 'delivery_fee', settingValue: deliveryFee }),
        updateSetting.mutateAsync({ settingKey: 'min_order_free_delivery', settingValue: minOrderFreeDelivery }),
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🚚 Delivery & Operations Settings</CardTitle>
        <CardDescription>
          Configure preparation times, delivery estimates, and fees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prep Buffer Time */}
        <div>
          <Label htmlFor="prep-buffer">Preparation Buffer Time (minutes)</Label>
          <Input
            id="prep-buffer"
            type="number"
            min="0"
            value={prepBuffer}
            onChange={(e) => setPrepBuffer(e.target.value)}
            placeholder="10"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Extra time added to menu item prep times for coordination and quality checks
          </p>
        </div>

        {/* Average Delivery Time */}
        <div>
          <Label htmlFor="delivery-time">Average Delivery Time (minutes)</Label>
          <Input
            id="delivery-time"
            type="number"
            min="0"
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Typical time from kitchen to customer door (used for delivery estimates)
          </p>
        </div>

        {/* Delivery Fee */}
        <div>
          <Label htmlFor="delivery-fee">Delivery Fee (£)</Label>
          <Input
            id="delivery-fee"
            type="number"
            min="0"
            step="0.01"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            placeholder="3.99"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Standard delivery charge added to all delivery orders
          </p>
        </div>

        {/* Minimum Order for Free Delivery */}
        <div>
          <Label htmlFor="min-order">Minimum Order for Free Delivery (£)</Label>
          <Input
            id="min-order"
            type="number"
            min="0"
            step="0.01"
            value={minOrderFreeDelivery}
            onChange={(e) => setMinOrderFreeDelivery(e.target.value)}
            placeholder="25"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Orders above this amount qualify for free delivery (leave as 0 to disable)
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Delivery Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
