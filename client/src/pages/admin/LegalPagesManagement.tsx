import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, FileText } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function LegalPagesManagement() {
  const utils = trpc.useUtils();

  // Fetch all legal pages
  const { data: legalPages = [], isLoading } = trpc.adminLegal.getAll.useQuery();

  // Update mutation
  const updateMutation = trpc.adminLegal.update.useMutation({
    onSuccess: () => {
      utils.adminLegal.getAll.invalidate();
      toast.success('Legal page updated successfully');
    },
    onError: (error) => {
      toast.error('Error updating legal page', { description: error.message });
    },
  });

  // Form state for each page type
  const [privacyForm, setPrivacyForm] = useState({
    title: '',
    content: '',
    isPublished: true,
  });

  const [termsForm, setTermsForm] = useState({
    title: '',
    content: '',
    isPublished: true,
  });

  const [accessibilityForm, setAccessibilityForm] = useState({
    title: '',
    content: '',
    isPublished: true,
  });

  // Load data when it arrives
  useState(() => {
    if (legalPages.length > 0) {
      const privacy = legalPages.find((p: any) => p.pageType === 'privacy-policy');
      const terms = legalPages.find((p: any) => p.pageType === 'terms-conditions');
      const accessibility = legalPages.find((p: any) => p.pageType === 'accessibility');

      if (privacy) {
        setPrivacyForm({
          title: privacy.title,
          content: privacy.content,
          isPublished: privacy.isPublished,
        });
      }

      if (terms) {
        setTermsForm({
          title: terms.title,
          content: terms.content,
          isPublished: terms.isPublished,
        });
      }

      if (accessibility) {
        setAccessibilityForm({
          title: accessibility.title,
          content: accessibility.content,
          isPublished: accessibility.isPublished,
        });
      }
    }
  });

  const handleSavePrivacy = async () => {
    await updateMutation.mutateAsync({
      pageType: 'privacy-policy',
      ...privacyForm,
    });
  };

  const handleSaveTerms = async () => {
    await updateMutation.mutateAsync({
      pageType: 'terms-conditions',
      ...termsForm,
    });
  };

  const handleSaveAccessibility = async () => {
    await updateMutation.mutateAsync({
      pageType: 'accessibility',
      ...accessibilityForm,
    });
  };

  if (isLoading) {
    return (
      
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        </AdminLayout>
      
    );
  }

  return (
    
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Legal Pages</h1>
            <p className="text-muted-foreground">Manage legal compliance pages (Privacy Policy, Terms & Conditions, Accessibility)</p>
          </div>

          {/* Privacy Policy */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Privacy Policy
                  </CardTitle>
                  <CardDescription>Manage your privacy policy content</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="privacyPublished"
                    checked={privacyForm.isPublished}
                    onCheckedChange={(checked) => setPrivacyForm({ ...privacyForm, isPublished: checked })}
                  />
                  <Label htmlFor="privacyPublished">Published</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="privacyTitle">Page Title</Label>
                <Input
                  id="privacyTitle"
                  value={privacyForm.title}
                  onChange={(e) => setPrivacyForm({ ...privacyForm, title: e.target.value })}
                  placeholder="Privacy Policy"
                />
              </div>
              <div>
                <Label htmlFor="privacyContent">Content (Markdown supported)</Label>
                <Textarea
                  id="privacyContent"
                  value={privacyForm.content}
                  onChange={(e) => setPrivacyForm({ ...privacyForm, content: e.target.value })}
                  placeholder="Enter privacy policy content here..."
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use Markdown formatting: **bold**, *italic*, # Heading, - List items
                </p>
              </div>
              <Button onClick={handleSavePrivacy} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Privacy Policy</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Terms & Conditions
                  </CardTitle>
                  <CardDescription>Manage your terms and conditions content</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="termsPublished"
                    checked={termsForm.isPublished}
                    onCheckedChange={(checked) => setTermsForm({ ...termsForm, isPublished: checked })}
                  />
                  <Label htmlFor="termsPublished">Published</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="termsTitle">Page Title</Label>
                <Input
                  id="termsTitle"
                  value={termsForm.title}
                  onChange={(e) => setTermsForm({ ...termsForm, title: e.target.value })}
                  placeholder="Terms & Conditions"
                />
              </div>
              <div>
                <Label htmlFor="termsContent">Content (Markdown supported)</Label>
                <Textarea
                  id="termsContent"
                  value={termsForm.content}
                  onChange={(e) => setTermsForm({ ...termsForm, content: e.target.value })}
                  placeholder="Enter terms and conditions content here..."
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use Markdown formatting: **bold**, *italic*, # Heading, - List items
                </p>
              </div>
              <Button onClick={handleSaveTerms} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Terms & Conditions</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Accessibility Statement */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Accessibility Statement
                  </CardTitle>
                  <CardDescription>Manage your accessibility statement content</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="accessibilityPublished"
                    checked={accessibilityForm.isPublished}
                    onCheckedChange={(checked) => setAccessibilityForm({ ...accessibilityForm, isPublished: checked })}
                  />
                  <Label htmlFor="accessibilityPublished">Published</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="accessibilityTitle">Page Title</Label>
                <Input
                  id="accessibilityTitle"
                  value={accessibilityForm.title}
                  onChange={(e) => setAccessibilityForm({ ...accessibilityForm, title: e.target.value })}
                  placeholder="Accessibility Statement"
                />
              </div>
              <div>
                <Label htmlFor="accessibilityContent">Content (Markdown supported)</Label>
                <Textarea
                  id="accessibilityContent"
                  value={accessibilityForm.content}
                  onChange={(e) => setAccessibilityForm({ ...accessibilityForm, content: e.target.value })}
                  placeholder="Enter accessibility statement content here..."
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use Markdown formatting: **bold**, *italic*, # Heading, - List items
                </p>
              </div>
              <Button onClick={handleSaveAccessibility} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Accessibility Statement</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    
  );
}
