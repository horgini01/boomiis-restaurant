import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Check, X, Star, CheckSquare, Square } from 'lucide-react';

export default function TestimonialsManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [selectedTestimonials, setSelectedTestimonials] = useState<number[]>([]);
  const [respondingToId, setRespondingToId] = useState<number | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    content: '',
    rating: 5,
    isApproved: false,
    isFeatured: false,
    displayOrder: 0,
  });

  const utils = trpc.useUtils();
  const { data: testimonials, isLoading } = trpc.testimonials.getAllAdmin.useQuery();
  const { data: templates } = trpc.testimonials.getTemplates.useQuery();

  const createMutation = trpc.testimonials.create.useMutation({
    onSuccess: () => {
      toast.success('Testimonial created successfully');
      utils.testimonials.getAllAdmin.invalidate();
      utils.testimonials.getAll.invalidate();
      utils.testimonials.getFeatured.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create testimonial');
    },
  });

  const updateMutation = trpc.testimonials.update.useMutation({
    onSuccess: () => {
      toast.success('Testimonial updated successfully');
      utils.testimonials.getAllAdmin.invalidate();
      utils.testimonials.getAll.invalidate();
      utils.testimonials.getFeatured.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update testimonial');
    },
  });

  const deleteMutation = trpc.testimonials.delete.useMutation({
    onSuccess: () => {
      toast.success('Testimonial deleted successfully');
      utils.testimonials.getAllAdmin.invalidate();
      utils.testimonials.getAll.invalidate();
      utils.testimonials.getFeatured.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete testimonial');
    },
  });

  const toggleApprovalMutation = trpc.testimonials.toggleApproval.useMutation({
    onSuccess: () => {
      toast.success('Approval status updated');
      utils.testimonials.getAllAdmin.invalidate();
      utils.testimonials.getAll.invalidate();
      utils.testimonials.getFeatured.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update approval status');
    },
  });

  const bulkApproveMutation = trpc.testimonials.bulkApprove.useMutation({
    onSuccess: () => {
      toast.success('Testimonials approved successfully');
      utils.testimonials.getAllAdmin.invalidate();
      utils.testimonials.getAll.invalidate();
      utils.testimonials.getFeatured.invalidate();
      setSelectedTestimonials([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve testimonials');
    },
  });

  const bulkRejectMutation = trpc.testimonials.bulkReject.useMutation({
    onSuccess: () => {
      toast.success('Testimonials rejected successfully');
      utils.testimonials.getAllAdmin.invalidate();
      utils.testimonials.getAll.invalidate();
      utils.testimonials.getFeatured.invalidate();
      setSelectedTestimonials([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject testimonials');
    },
  });

  const toggleFeaturedMutation = trpc.testimonials.toggleFeatured.useMutation({
    onSuccess: () => {
      toast.success('Featured status updated');
      utils.testimonials.getAllAdmin.invalidate();
      utils.testimonials.getFeatured.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update featured status');
    },
  });

  const updateResponseMutation = trpc.testimonials.updateResponse.useMutation({
    onSuccess: () => {
      toast.success('Response updated successfully');
      utils.testimonials.getAllAdmin.invalidate();
      utils.testimonials.getAll.invalidate();
      utils.testimonials.getFeatured.invalidate();
      setRespondingToId(null);
      setResponseText('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update response');
    },
  });

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerEmail: '',
      content: '',
      rating: 5,
      isApproved: false,
      isFeatured: false,
      displayOrder: 0,
    });
    setEditingTestimonial(null);
  };

  const handleEdit = (testimonial: any) => {
    setEditingTestimonial(testimonial);
    setFormData({
      customerName: testimonial.customerName,
      customerEmail: testimonial.customerEmail || '',
      content: testimonial.content,
      rating: testimonial.rating,
      isApproved: testimonial.isApproved,
      isFeatured: testimonial.isFeatured,
      displayOrder: testimonial.displayOrder,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTestimonial) {
      updateMutation.mutate({ id: editingTestimonial.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this testimonial?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggleApproval = (id: number, currentStatus: boolean) => {
    toggleApprovalMutation.mutate({ id, isApproved: !currentStatus });
  };

  const handleToggleFeatured = (id: number, currentStatus: boolean) => {
    toggleFeaturedMutation.mutate({ id, isFeatured: !currentStatus });
  };

  const handleToggleSelection = (id: number) => {
    setSelectedTestimonials(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTestimonials.length === testimonials?.length) {
      setSelectedTestimonials([]);
    } else {
      setSelectedTestimonials(testimonials?.map((t: any) => t.id) || []);
    }
  };

  const handleBulkApprove = () => {
    if (selectedTestimonials.length === 0) {
      toast.error('Please select testimonials to approve');
      return;
    }
    bulkApproveMutation.mutate({ ids: selectedTestimonials });
  };

  const handleBulkReject = () => {
    if (selectedTestimonials.length === 0) {
      toast.error('Please select testimonials to reject');
      return;
    }
    if (confirm(`Are you sure you want to reject and delete ${selectedTestimonials.length} testimonial(s)?`)) {
      bulkRejectMutation.mutate({ ids: selectedTestimonials });
    }
  };

  const handleStartResponse = (testimonial: any) => {
    setRespondingToId(testimonial.id);
    setResponseText(testimonial.adminResponse || '');
  };

  const handleSaveResponse = (id: number) => {
    updateResponseMutation.mutate({ 
      id, 
      adminResponse: responseText.trim() || undefined 
    });
  };

  const handleCancelResponse = () => {
    setRespondingToId(null);
    setResponseText('');
    setSelectedTemplate('');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates?.find(t => t.id.toString() === templateId);
      if (template) {
        setResponseText(template.content);
      }
    }
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Testimonials</h1>
              <p className="text-muted-foreground mt-2">
                Manage customer testimonials and reviews
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Testimonial
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Customer Email</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Testimonial Content *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={5}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rating">Rating (1-5) *</Label>
                      <Input
                        id="rating"
                        type="number"
                        min="1"
                        max="5"
                        value={formData.rating}
                        onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayOrder">Display Order</Label>
                      <Input
                        id="displayOrder"
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-4 pt-8">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isApproved"
                          checked={formData.isApproved}
                          onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="isApproved" className="cursor-pointer">Approved</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isFeatured"
                          checked={formData.isFeatured}
                          onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="isFeatured" className="cursor-pointer">Featured</Label>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingTestimonial ? 'Update Testimonial' : 'Create Testimonial'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {selectedTestimonials.length > 0 && (
                <Card className="border-primary/20 mb-6 bg-primary/10">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          Bulk Operations - {selectedTestimonials.length} testimonial{selectedTestimonials.length > 1 ? 's' : ''} selected
                        </h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTestimonials([])}
                        >
                          Clear Selection
                        </Button>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleBulkApprove}
                          disabled={bulkApproveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {bulkApproveMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Approve Selected
                        </Button>
                        <Button
                          onClick={handleBulkReject}
                          disabled={bulkRejectMutation.isPending}
                          variant="destructive"
                        >
                          {bulkRejectMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <X className="mr-2 h-4 w-4" />
                          )}
                          Reject Selected
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <button
                            onClick={handleSelectAll}
                            className="flex items-center justify-center"
                          >
                            {selectedTestimonials.length === testimonials?.length ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead>Customer</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testimonials?.map((testimonial: any) => (
                      <>
                      <TableRow key={testimonial.id}>
                        <TableCell>
                          <button
                            onClick={() => handleToggleSelection(testimonial.id)}
                            className="flex items-center justify-center"
                          >
                            {selectedTestimonials.includes(testimonial.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{testimonial.customerName}</div>
                            {testimonial.customerEmail && (
                              <div className="text-sm text-muted-foreground">{testimonial.customerEmail}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate text-sm">{testimonial.content}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: testimonial.rating }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              testimonial.isApproved
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-yellow-500/10 text-yellow-500'
                            }`}
                          >
                            {testimonial.isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {testimonial.isFeatured && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              Featured
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{testimonial.displayOrder}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleApproval(testimonial.id, testimonial.isApproved)}
                              title={testimonial.isApproved ? 'Unapprove' : 'Approve'}
                            >
                              {testimonial.isApproved ? (
                                <X className="h-4 w-4 text-red-500" />
                              ) : (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleFeatured(testimonial.id, testimonial.isFeatured)}
                              title={testimonial.isFeatured ? 'Remove from featured' : 'Add to featured'}
                            >
                              <Star className={`h-4 w-4 ${testimonial.isFeatured ? 'fill-primary text-primary' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(testimonial)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(testimonial.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Admin Response Row */}
                      <TableRow key={`${testimonial.id}-response`} className="bg-muted/30">
                        <TableCell colSpan={8}>
                          <div className="py-2 px-4">
                            {respondingToId === testimonial.id ? (
                              <div className="space-y-3">
                                <Label className="text-sm font-semibold">Admin Response</Label>
                                {templates && templates.length > 0 && (
                                  <div>
                                    <Label htmlFor="template-select" className="text-xs text-muted-foreground">Quick Reply Template</Label>
                                    <select
                                      id="template-select"
                                      value={selectedTemplate}
                                      onChange={(e) => handleTemplateSelect(e.target.value)}
                                      className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                      <option value="">-- Select a template --</option>
                                      {templates.map((template: any) => (
                                        <option key={template.id} value={template.id.toString()}>
                                          {template.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                <Textarea
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                  placeholder="Write your response to this testimonial..."
                                  rows={3}
                                  className="w-full"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveResponse(testimonial.id)}
                                    disabled={updateResponseMutation.isPending}
                                  >
                                    {updateResponseMutation.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    Save Response
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelResponse}
                                    disabled={updateResponseMutation.isPending}
                                  >
                                    Cancel
                                  </Button>
                                  {testimonial.adminResponse && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        if (confirm('Remove this response?')) {
                                          updateResponseMutation.mutate({ id: testimonial.id, adminResponse: undefined });
                                        }
                                      }}
                                      disabled={updateResponseMutation.isPending}
                                    >
                                      Remove Response
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {testimonial.adminResponse ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-primary">Admin Response:</span>
                                        {testimonial.adminResponseDate && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(testimonial.adminResponseDate).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground italic">{testimonial.adminResponse}</p>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">No response yet</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartResponse(testimonial)}
                                >
                                  {testimonial.adminResponse ? 'Edit Response' : 'Add Response'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      </>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
