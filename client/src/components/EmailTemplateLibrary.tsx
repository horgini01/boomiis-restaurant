import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { emailTemplates, EmailTemplate } from '@/lib/emailTemplates';
import { Eye } from 'lucide-react';

interface EmailTemplateLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: EmailTemplate) => void;
}

export function EmailTemplateLibrary({ open, onClose, onSelectTemplate }: EmailTemplateLibraryProps) {
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EmailTemplate['category']>('welcome');

  const handleUseTemplate = (template: EmailTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const categoryCounts = {
    welcome: emailTemplates.filter(t => t.category === 'welcome').length,
    promotion: emailTemplates.filter(t => t.category === 'promotion').length,
    event: emailTemplates.filter(t => t.category === 'event').length,
    seasonal: emailTemplates.filter(t => t.category === 'seasonal').length,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Template Library</DialogTitle>
          </DialogHeader>

          <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as EmailTemplate['category'])}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="welcome">
                Welcome ({categoryCounts.welcome})
              </TabsTrigger>
              <TabsTrigger value="promotion">
                Promotions ({categoryCounts.promotion})
              </TabsTrigger>
              <TabsTrigger value="event">
                Events ({categoryCounts.event})
              </TabsTrigger>
              <TabsTrigger value="seasonal">
                Seasonal ({categoryCounts.seasonal})
              </TabsTrigger>
            </TabsList>

            {(['welcome', 'promotion', 'event', 'seasonal'] as const).map((category) => (
              <TabsContent key={category} value={category} className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {emailTemplates
                    .filter((template) => template.category === category)
                    .map((template) => (
                      <div
                        key={template.id}
                        className="border rounded-lg p-4 hover:border-primary transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{template.thumbnail}</span>
                            <div>
                              <h3 className="font-semibold">{template.name}</h3>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {template.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-4">
                          {template.description}
                        </p>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewTemplate(template)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUseTemplate(template)}
                            className="flex-1"
                          >
                            Use Template
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {previewTemplate?.thumbnail} {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto border rounded-lg bg-gray-50 p-4">
            {previewTemplate && (
              <div className="bg-white max-w-2xl mx-auto">
                {/* Email wrapper preview */}
                <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.6, color: '#333', margin: 0, padding: 0 }}>
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ background: '#d4a574', color: 'white', padding: '30px 20px', textAlign: 'center' }}>
                      <h1 style={{ margin: 0, fontSize: '24px' }}>Boomiis Restaurant</h1>
                    </div>
                    <div style={{ background: '#f9f9f9', padding: '30px 20px' }}>
                      <div dangerouslySetInnerHTML={{ __html: previewTemplate.bodyHtml }} />
                    </div>
                    <div style={{ background: '#333', color: '#fff', padding: '20px', textAlign: 'center', fontSize: '14px' }}>
                      <p><strong>Boomiis Restaurant</strong></p>
                      <p>Authentic West African Cuisine</p>
                      <p>✉️ hello@boomiis.uk</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            {previewTemplate && (
              <Button onClick={() => {
                handleUseTemplate(previewTemplate);
                setPreviewTemplate(null);
              }}>
                Use This Template
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
