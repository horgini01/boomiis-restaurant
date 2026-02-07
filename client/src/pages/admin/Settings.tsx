import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Mail, Save, Send } from 'lucide-react';

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.admin.getSettings.useQuery();
  const [dailyEmailEnabled, setDailyEmailEnabled] = useState(false);
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(false);
  const [reservationRemindersEnabled, setReservationRemindersEnabled] = useState(false);
  const [anomalyAlertsEnabled, setAnomalyAlertsEnabled] = useState(false);
  const [auditAlertsEnabled, setAuditAlertsEnabled] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);

  // Update local state when settings load
  if (settings && !isLoading) {
    const dailySetting = settings.find((s: any) => s.settingKey === 'daily_sales_email_enabled');
    const dailyEnabled = dailySetting?.settingValue === 'true';
    if (dailyEmailEnabled !== dailyEnabled) {
      setDailyEmailEnabled(dailyEnabled);
    }

    const weeklySetting = settings.find((s: any) => s.settingKey === 'weekly_report_email_enabled');
    const weeklyEnabled = weeklySetting?.settingValue === 'true';
    if (weeklyReportEnabled !== weeklyEnabled) {
      setWeeklyReportEnabled(weeklyEnabled);
    }

    const remindersSetting = settings.find((s: any) => s.settingKey === 'reservation_reminders_enabled');
    const remindersEnabled = remindersSetting?.settingValue === 'true';
    if (reservationRemindersEnabled !== remindersEnabled) {
      setReservationRemindersEnabled(remindersEnabled);
    }

    const anomalySetting = settings.find((s: any) => s.settingKey === 'anomaly_alerts_enabled');
    const anomalyEnabled = anomalySetting?.settingValue === 'true';
    if (anomalyAlertsEnabled !== anomalyEnabled) {
      setAnomalyAlertsEnabled(anomalyEnabled);
    }

    const auditSetting = settings.find((s: any) => s.settingKey === 'audit_alerts_enabled');
    const auditEnabled = auditSetting?.settingValue === 'true';
    if (auditAlertsEnabled !== auditEnabled) {
      setAuditAlertsEnabled(auditEnabled);
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
    try {
      await updateSettingMutation.mutateAsync({
        settingKey: 'daily_sales_email_enabled',
        settingValue: dailyEmailEnabled ? 'true' : 'false',
      });
      await updateSettingMutation.mutateAsync({
        settingKey: 'weekly_report_email_enabled',
        settingValue: weeklyReportEnabled ? 'true' : 'false',
      });
      await updateSettingMutation.mutateAsync({
        settingKey: 'reservation_reminders_enabled',
        settingValue: reservationRemindersEnabled ? 'true' : 'false',
      });
      await updateSettingMutation.mutateAsync({
        settingKey: 'anomaly_alerts_enabled',
        settingValue: anomalyAlertsEnabled ? 'true' : 'false',
      });
      await updateSettingMutation.mutateAsync({
        settingKey: 'audit_alerts_enabled',
        settingValue: auditAlertsEnabled ? 'true' : 'false',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
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

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="weekly-email" className="text-base font-medium">
                        Weekly Performance Report
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Send a comprehensive weekly report to your admin email with revenue, orders, customer insights, and alerts.
                        Uses the customizable "Weekly Report" email template.
                      </p>
                    </div>
                    <Switch
                      id="weekly-email"
                      checked={weeklyReportEnabled}
                      onCheckedChange={setWeeklyReportEnabled}
                    />
                  </div>
                  <div className="mt-3">
                    <Button
                      onClick={async () => {
                        setIsSendingReport(true);
                        try {
                          const response = await fetch('/api/send-weekly-report', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                          });
                          const data = await response.json();
                          if (response.ok) {
                            toast.success('Weekly report sent successfully!');
                          } else {
                            toast.error(data.error || 'Failed to send report');
                          }
                        } catch (error: any) {
                          toast.error('Failed to send report: ' + error.message);
                        } finally {
                          setIsSendingReport(false);
                        }
                      }}
                      disabled={isSendingReport}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {isSendingReport ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending Report...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Weekly Report Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="reservation-reminders" className="text-base font-medium">
                        Reservation Reminders
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically send email reminders to customers 24 hours before their reservation.
                        Helps reduce no-shows and improve customer experience.
                      </p>
                    </div>
                    <Switch
                      id="reservation-reminders"
                      checked={reservationRemindersEnabled}
                      onCheckedChange={setReservationRemindersEnabled}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="anomaly-alerts" className="text-base font-medium">
                        Security Anomaly Alerts
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email alerts when suspicious patterns are detected (multiple failures, after-hours changes, bulk deletions).
                        Helps monitor security and prevent unauthorized access.
                      </p>
                    </div>
                    <Switch
                      id="anomaly-alerts"
                      checked={anomalyAlertsEnabled}
                      onCheckedChange={setAnomalyAlertsEnabled}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="audit-alerts" className="text-base font-medium">
                        Critical Action Alerts
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications for critical administrative actions (user deletions, settings changes, delivery zone updates).
                        Provides real-time oversight of important changes.
                      </p>
                    </div>
                    <Switch
                      id="audit-alerts"
                      checked={auditAlertsEnabled}
                      onCheckedChange={setAuditAlertsEnabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
