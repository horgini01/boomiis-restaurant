import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Mail, Plus, Trash2, Loader2 } from "lucide-react";

export default function AdminEmailSettings() {
  const { data: settings, refetch } = trpc.admin.getSettings.useQuery();
  const updateSetting = trpc.admin.updateSetting.useMutation({
    onSuccess: () => {
      toast.success("Email settings updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [ccOnStatusUpdates, setCcOnStatusUpdates] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from settings
  useState(() => {
    if (settings) {
      const emailsSetting = settings.find(s => s.settingKey === 'admin_emails');
      if (emailsSetting && emailsSetting.settingValue) {
        const emails = emailsSetting.settingValue.split(',').map(e => e.trim()).filter(Boolean);
        setAdminEmails(emails);
      }

      const ccSetting = settings.find(s => s.settingKey === 'cc_admin_on_status_updates');
      if (ccSetting) {
        setCcOnStatusUpdates(ccSetting.settingValue === 'true');
      }
    }
  });

  const handleAddEmail = () => {
    const email = newEmail.trim();
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (adminEmails.includes(email)) {
      toast.error("This email is already in the list");
      return;
    }

    setAdminEmails([...adminEmails, email]);
    setNewEmail("");
  };

  const handleRemoveEmail = (email: string) => {
    setAdminEmails(adminEmails.filter(e => e !== email));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save admin emails
      await updateSetting.mutateAsync({
        settingKey: 'admin_emails',
        settingValue: adminEmails.join(','),
      });

      // Save CC preference
      await updateSetting.mutateAsync({
        settingKey: 'cc_admin_on_status_updates',
        settingValue: ccOnStatusUpdates.toString(),
      });

      toast.success("Admin email settings saved successfully");
    } catch (error) {
      console.error('Failed to save email settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Admin Notification Emails
        </CardTitle>
        <CardDescription>
          Manage email addresses that receive order notifications and updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new email */}
        <div className="space-y-2">
          <Label>Add Admin Email</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="admin@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddEmail();
                }
              }}
            />
            <Button onClick={handleAddEmail} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Email list */}
        <div className="space-y-2">
          <Label>Admin Email Addresses ({adminEmails.length})</Label>
          {adminEmails.length === 0 ? (
            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md text-center">
              No admin emails configured. Add at least one email to receive order notifications.
            </div>
          ) : (
            <div className="space-y-2">
              {adminEmails.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-muted p-3 rounded-md"
                >
                  <span className="text-sm">{email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEmail(email)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CC on status updates */}
        <div className="flex items-center justify-between space-x-2 p-4 border rounded-md">
          <div className="space-y-0.5">
            <Label>Copy admins on order status updates</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, all admin emails will be CC'd when order status changes (e.g., preparing, ready, completed)
            </p>
          </div>
          <Switch
            checked={ccOnStatusUpdates}
            onCheckedChange={setCcOnStatusUpdates}
          />
        </div>

        {/* Save button */}
        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Email Settings"
          )}
        </Button>

        {/* Info note */}
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
          <strong>Note:</strong> All admin emails will receive notifications for new orders. The CC option controls whether they also receive order status update emails sent to customers.
        </div>
      </CardContent>
    </Card>
  );
}
