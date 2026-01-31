import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Mail, Save } from 'lucide-react';

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.admin.getSettings.useQuery();
  const [dailyEmailEnabled, setDailyEmailEnabled] = useState(false);

  // Update local state when settings load
  if (settings && !isLoading) {
    const emailSetting = settings.find((s: any) => s.settingKey === 'daily_sales_email_enabled');
    const enabled = emailSetting?.settingValue === 'true';
    if (dailyEmailEnabled !== enabled) {
      setDailyEmailEnabled(enabled);
    }
  }

  const updateSettingMutation = trpc.admin.updateSetting.useMutation({
    onSuccess: () => {
      utils.admin.getSettings.invalidate();
      toast.success('Settings saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  const handleSave = async () => {
    await updateSettingMutation.mutateAsync({
      settingKey: 'daily_sales_email_enabled',
      settingValue: dailyEmailEnabled ? 'true' : 'false',
    });
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div>
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">
            Manage your restaurant settings and preferences
          </p>

          <div className="max-w-2xl space-y-6">
            {/* Email Notifications */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle>Email Notifications</CardTitle>
                </div>
                <CardDescription>
                  Configure automated email notifications and reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="daily-email" className="text-base font-medium">
                      Daily Sales Summary
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a daily email report with sales metrics, popular items, and performance data. 
                      Sent automatically at the end of each business day.
                    </p>
                  </div>
                  <Switch
                    id="daily-email"
                    checked={dailyEmailEnabled}
                    onCheckedChange={setDailyEmailEnabled}
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={updateSettingMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {updateSettingMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Future settings sections can be added here */}
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>More settings coming soon...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
