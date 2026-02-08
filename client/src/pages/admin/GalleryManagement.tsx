import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Upload } from 'lucide-react';

export function GalleryManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [newImage, setNewImage] = useState({
    title: '',
    description: '',
    category: 'dishes' as 'ambiance' | 'dishes' | 'events' | 'team',
    displayOrder: 0,
  });

  const { data: images, refetch } = trpc.gallery.listAll.useQuery();
  const createImage = trpc.gallery.create.useMutation();
  const deleteImage = trpc.gallery.delete.useMutation();
  const toggleActive = trpc.gallery.toggleActive.useMutation();
  const uploadOptimized = trpc.admin.uploadOptimizedImage.useMutation();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      toast.error('Please select an image');
      return;
    }

    try {
      // Upload and optimize image
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const uploadResult = await uploadOptimized.mutateAsync({
          imageBase64: base64,
          filename: imageFile.name,
        });

        // Create gallery entry
        await createImage.mutateAsync({
          ...newImage,
          imageUrl: uploadResult.url,
        });

        toast.success('Image added to gallery');
        setIsAddDialogOpen(false);
        setImageFile(null);
        setNewImage({ title: '', description: '', category: 'dishes', displayOrder: 0 });
        refetch();
      };
      reader.readAsDataURL(imageFile);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add image');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await deleteImage.mutateAsync({ id });
      toast.success('Image deleted');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete image');
    }
  };

  return (
    
      <AdminLayout>
        <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gallery Management</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Image
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Image</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="image">Image File</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newImage.title}
                      onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newImage.description}
                      onChange={(e) => setNewImage({ ...newImage, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newImage.category}
                      onValueChange={(value: any) => setNewImage({ ...newImage, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ambiance">Restaurant Ambiance</SelectItem>
                        <SelectItem value="dishes">Our Dishes</SelectItem>
                        <SelectItem value="events">Events & Catering</SelectItem>
                        <SelectItem value="team">Our Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="displayOrder">Display Order</Label>
                    <Input
                      id="displayOrder"
                      type="number"
                      value={newImage.displayOrder}
                      onChange={(e) =>
                        setNewImage({ ...newImage, displayOrder: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createImage.isPending || uploadOptimized.isPending}>
                    {createImage.isPending || uploadOptimized.isPending ? 'Adding...' : 'Add Image'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!images || images.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No images in gallery</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.imageUrl}
                    alt={image.title || 'Gallery image'}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-3">
                    <div className="text-white text-sm">
                      <div className="font-semibold">{image.title}</div>
                      <div className="text-xs text-gray-300">{image.category}</div>
                      <div className="text-xs mt-1">
                        <span className={`px-2 py-0.5 rounded ${image.isActive ? 'bg-green-500' : 'bg-gray-500'}`}>
                          {image.isActive ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={image.isActive ? 'secondary' : 'default'}
                        onClick={async () => {
                          try {
                            await toggleActive.mutateAsync({ id: image.id, isActive: !image.isActive });
                            toast.success(image.isActive ? 'Image hidden from public gallery' : 'Image now visible in public gallery');
                            refetch();
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to toggle visibility');
                          }
                        }}
                        disabled={toggleActive.isPending}
                      >
                        {image.isActive ? 'Hide' : 'Show'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(image.id)}
                        disabled={deleteImage.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
      </AdminLayout>
    
  );
}
