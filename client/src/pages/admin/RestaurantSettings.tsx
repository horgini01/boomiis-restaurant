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
import AdminEmailSettings from "./AdminEmailSettings";
import EmailTemplatesEditor from "./EmailTemplatesEditor";
import DeliverySettings from "./DeliverySettings";
import { DeliveryAreasSettings } from "@/components/DeliveryAreasSettings";

export default function RestaurantSettings() {
  const { data: settings, isLoading, refetch } = trpc.admin.getSettings.useQuery();
  const { data: openingHoursData, refetch: refetchHours } = trpc.openingHours.list.useQuery();
  
  const updateSetting = trpc.admin.updateSetting.useMutation({
    onSuccess: () => {
      toast.success("Settings updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateOpeningHours = trpc.openingHours.updateBulk.useMutation({
    onSuccess: () => {
      toast.success("Opening hours updated successfully");
      refetchHours();
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
  const [openingHours, setOpeningHours] = useState<Array<{
    id: number;
    dayOfWeek: number;
    dayName: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>>([]);
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
    }
  }, [settings]);

  // Initialize opening hours from database
  useEffect(() => {
    if (openingHoursData) {
      setOpeningHours(openingHoursData);
    }
  }, [openingHoursData]);

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    const promises = Object.entries(formData).map(([key, value]) =>
      updateSetting.mutateAsync({ settingKey: key, settingValue: value })
    );
    await Promise.all(promises);
  };

  const handleSaveOpeningHours = async () => {
    await updateOpeningHours.mutateAsync(
      openingHours.map(h => ({
        id: h.id,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      }))
    );
  };

  const handleHoursChange = (id: number, field: 'openTime' | 'closeTime' | 'isClosed', value: string | boolean) => {
    setOpeningHours(prev => 
      prev.map(h => 
        h.id === id 
          ? { ...h, [field]: value }
          : h
      )
    );
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
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="delivery-areas">Delivery Areas</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="templates">Email Templates</TabsTrigger>
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

                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <h4 className="font-medium mb-2">Map Coordinates</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Set your restaurant location for Google Maps on the Contact page. You can find coordinates by searching your address on <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Maps</a>, right-clicking the location, and selecting the coordinates.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="restaurant_latitude">Latitude</Label>
                        <Input
                          id="restaurant_latitude"
                          type="number"
                          step="any"
                          value={formData.restaurant_latitude || ""}
                          onChange={(e) => handleInputChange("restaurant_latitude", e.target.value)}
                          placeholder="50.470180"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="restaurant_longitude">Longitude</Label>
                        <Input
                          id="restaurant_longitude"
                          type="number"
                          step="any"
                          value={formData.restaurant_longitude || ""}
                          onChange={(e) => handleInputChange("restaurant_longitude", e.target.value)}
                          placeholder="-3.537695"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hours">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Opening Hours</CardTitle>
                      <CardDescription>
                        Set your restaurant opening hours for each day of the week
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={handleSaveOpeningHours} 
                      disabled={updateOpeningHours.isPending}
                    >
                      {updateOpeningHours.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Hours
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {openingHours.map((hours) => (
                    <div key={hours.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-32 font-medium">{hours.dayName}</div>
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={hours.openTime}
                          onChange={(e) => handleHoursChange(hours.id, "openTime", e.target.value)}
                          disabled={hours.isClosed}
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={hours.closeTime}
                          onChange={(e) => handleHoursChange(hours.id, "closeTime", e.target.value)}
                          disabled={hours.isClosed}
                          className="w-32"
                        />
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hours.isClosed}
                          onChange={(e) => handleHoursChange(hours.id, "isClosed", e.target.checked)}
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

            <TabsContent value="operations">
              <DeliverySettings />
            </TabsContent>

            <TabsContent value="delivery-areas">
              <DeliveryAreasSettings />
            </TabsContent>

            <TabsContent value="notifications">
              <AdminEmailSettings />
            </TabsContent>

            <TabsContent value="templates">
              <EmailTemplatesEditor />
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
