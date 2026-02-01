import { useState, useEffect } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Upload, Image as ImageIcon } from "lucide-react";
import EmailPreview from "./EmailPreview";

export default function RestaurantSettings() {
  const { data: settings, isLoading, refetch } = trpc.admin.getSettings.useQuery();
  const updateSetting = trpc.admin.updateSetting.useMutation({
    onSuccess: () => {
      toast.success("Settings updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const uploadLogo = trpc.admin.uploadLogo.useMutation({
    onSuccess: (data) => {
      toast.success("Logo uploaded successfully");
      setFormData(prev => ({ ...prev, restaurant_logo: data.url }));
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [openingHours, setOpeningHours] = useState<any>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      const data: Record<string, string> = {};
      settings.forEach((setting) => {
        data[setting.settingKey] = setting.settingValue;
      });
      setFormData(data);

      // Parse opening hours
      try {
        const hours = JSON.parse(data.opening_hours || "{}");
        setOpeningHours(hours);
      } catch {
        setOpeningHours({
          monday: { open: "12:00", close: "22:00", closed: false },
          tuesday: { open: "12:00", close: "22:00", closed: false },
          wednesday: { open: "12:00", close: "22:00", closed: false },
          thursday: { open: "12:00", close: "22:00", closed: false },
          friday: { open: "12:00", close: "23:00", closed: false },
          saturday: { open: "12:00", close: "23:00", closed: false },
          sunday: { open: "12:00", close: "21:00", closed: false },
        });
      }
    }
  }, [settings]);

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    const promises = Object.entries(formData).map(([key, value]) =>
      updateSetting.mutateAsync({ settingKey: key, settingValue: value })
    );
    await Promise.all(promises);
  };

  const handleHoursChange = (day: string, field: string, value: string | boolean) => {
    const updated = {
      ...openingHours,
      [day]: { ...openingHours[day], [field]: value },
    };
    setOpeningHours(updated);
    handleInputChange("opening_hours", JSON.stringify(updated));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo file size must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      await uploadLogo.mutateAsync({
        fileData: base64Data,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    fileReader.readAsDataURL(file);
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 1MB for favicon)
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Favicon file size must be less than 1MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setFaviconPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server using same uploadLogo mutation but save to favicon setting
    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      const result = await uploadLogo.mutateAsync({
        fileData: base64Data,
        fileName: `favicon-${file.name}`,
        mimeType: file.type,
      });
      // Update favicon setting
      setFormData(prev => ({ ...prev, favicon: result.url }));
      toast.success("Favicon uploaded successfully");
    };
    fileReader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Restaurant Information</h1>
              <p className="text-muted-foreground">
                Manage your restaurant name, description, contact details, and hours
              </p>
            </div>
            <Button onClick={handleSaveAll} disabled={updateSetting.isPending}>
              {updateSetting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save All Changes
            </Button>
          </div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="hours">Opening Hours</TabsTrigger>
              <TabsTrigger value="social">Social Media</TabsTrigger>
              <TabsTrigger value="email">Email Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>
                    Update your restaurant name and description
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="restaurant_name">Restaurant Name</Label>
                    <Input
                      id="restaurant_name"
                      value={formData.restaurant_name || ""}
                      onChange={(e) => handleInputChange("restaurant_name", e.target.value)}
                      placeholder="Boomiis"
                    />
                    <p className="text-sm text-muted-foreground">
                      Displayed in header, footer, and page titles across the site
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="restaurant_tagline">Tagline / Description</Label>
                    <Textarea
                      id="restaurant_tagline"
                      value={formData.restaurant_tagline || ""}
                      onChange={(e) => handleInputChange("restaurant_tagline", e.target.value)}
                      placeholder="Authentic African cuisine bringing the flavors of West Africa to the UK..."
                      rows={4}
                    />
                    <p className="text-sm text-muted-foreground">
                      Shown on the homepage and footer
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="restaurant_logo">Restaurant Logo</Label>
                    <div className="flex items-center gap-4">
                      {(logoPreview || formData.restaurant_logo) && (
                        <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          <img
                            src={logoPreview || formData.restaurant_logo}
                            alt="Restaurant logo"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      )}
                      {!(logoPreview || formData.restaurant_logo) && (
                        <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            id="restaurant_logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="cursor-pointer flex-1"
                          />
                          {formData.restaurant_logo && (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, restaurant_logo: "" }));
                                setLogoPreview(null);
                                toast.success("Logo removed");
                              }}
                            >
                              Remove Logo
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upload your restaurant logo (PNG, JPG, SVG). Displayed in header, kitchen display, and emails.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="favicon">Favicon</Label>
                    <div className="flex items-center gap-4">
                      {(faviconPreview || formData.favicon) && (
                        <div className="relative w-16 h-16 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          <img
                            src={faviconPreview || formData.favicon}
                            alt="Favicon"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      )}
                      {!(faviconPreview || formData.favicon) && (
                        <div className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            id="favicon"
                            type="file"
                            accept="image/*"
                            onChange={handleFaviconUpload}
                            className="cursor-pointer flex-1"
                          />
                          {formData.favicon && (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, favicon: "" }));
                                setFaviconPreview(null);
                                toast.success("Favicon removed");
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upload your favicon (ICO, PNG). Displayed in browser tabs. Recommended size: 32x32 or 16x16 pixels.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>
                    Update your restaurant contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_address">Address</Label>
                    <Textarea
                      id="contact_address"
                      value={formData.contact_address || ""}
                      onChange={(e) => handleInputChange("contact_address", e.target.value)}
                      placeholder="123 High Street, London, UK, SW1A 1AA"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Phone Number</Label>
                    <Input
                      id="contact_phone"
                      type="tel"
                      value={formData.contact_phone || ""}
                      onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                      placeholder="+44 20 1234 5678"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email Address</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email || ""}
                      onChange={(e) => handleInputChange("contact_email", e.target.value)}
                      placeholder="hello@boomiis.uk"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hours">
              <Card>
                <CardHeader>
                  <CardTitle>Opening Hours</CardTitle>
                  <CardDescription>
                    Set your restaurant opening hours for each day of the week
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(openingHours).map(([day, hours]: [string, any]) => (
                    <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-32 font-medium capitalize">{day}</div>
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => handleHoursChange(day, "open", e.target.value)}
                          disabled={hours.closed}
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => handleHoursChange(day, "close", e.target.value)}
                          disabled={hours.closed}
                          className="w-32"
                        />
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hours.closed}
                          onChange={(e) => handleHoursChange(day, "closed", e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Closed</span>
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social">
              <Card>
                <CardHeader>
                  <CardTitle>Social Media</CardTitle>
                  <CardDescription>
                    Update your social media profile links
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="social_facebook">Facebook</Label>
                    <Input
                      id="social_facebook"
                      type="url"
                      value={formData.social_facebook || ""}
                      onChange={(e) => handleInputChange("social_facebook", e.target.value)}
                      placeholder="https://facebook.com/boomiis"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social_instagram">Instagram</Label>
                    <Input
                      id="social_instagram"
                      type="url"
                      value={formData.social_instagram || ""}
                      onChange={(e) => handleInputChange("social_instagram", e.target.value)}
                      placeholder="https://instagram.com/boomiis"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social_twitter">Twitter / X</Label>
                    <Input
                      id="social_twitter"
                      type="url"
                      value={formData.social_twitter || ""}
                      onChange={(e) => handleInputChange("social_twitter", e.target.value)}
                      placeholder="https://twitter.com/boomiis"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email">
              <EmailPreview />
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
