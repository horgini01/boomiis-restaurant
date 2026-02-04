import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import AdminLayout from '@/components/AdminLayout';
import AdminGuard from '@/components/AdminGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Trash2, Edit, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

export default function AboutContentManagement() {
  // Using sonner toast
  const utils = trpc.useUtils();

  // Fetch data
  const { data: contentData = [], isLoading: loadingContent } = trpc.adminAbout.getAllContent.useQuery();
  const { data: valuesData = [], isLoading: loadingValues } = trpc.adminAbout.getAllValues.useQuery();
  const { data: teamData = [], isLoading: loadingTeam } = trpc.adminAbout.getAllTeam.useQuery();
  const { data: awardsData = [], isLoading: loadingAwards } = trpc.adminAbout.getAllAwards.useQuery();

  // Mutations
  const updateContentMutation = trpc.adminAbout.updateContent.useMutation({
    onSuccess: () => {
      utils.adminAbout.getAllContent.invalidate();
      toast.success('Content updated successfully');
    },
    onError: (error) => {
      toast.error('Error updating content', { description: error.message });
    },
  });

  const createValueMutation = trpc.adminAbout.createValue.useMutation({
    onSuccess: () => {
      utils.adminAbout.getAllValues.invalidate();
      toast.success('Value created successfully');
      setValueDialog(false);
      resetValueForm();
    },
    onError: (error) => {
      toast.error('Error creating value', { description: error.message });
    },
  });

  const updateValueMutation = trpc.adminAbout.updateValue.useMutation({
    onSuccess: () => {
      utils.adminAbout.getAllValues.invalidate();
      toast.success('Value updated successfully');
      setValueDialog(false);
      resetValueForm();
    },
    onError: (error) => {
      toast.error('Error updating value', { description: error.message });
    },
  });

  const deleteValueMutation = trpc.adminAbout.deleteValue.useMutation({
    onSuccess: () => {
      utils.adminAbout.getAllValues.invalidate();
      toast.success('Value deleted successfully');
    },
    onError: (error) => {
      toast.error('Error deleting value', { description: error.message });
    },
  });

  const createTeamMutation = trpc.adminAbout.createTeamMember.useMutation({
    onSuccess: () => {
      utils.adminAbout.getAllTeam.invalidate();
      toast.success('Team member created successfully');
      setTeamDialog(false);
      resetTeamForm();
    },
    onError: (error) => {
      toast.error('Error creating team member', { description: error.message });
    },
  });

  const updateTeamMutation = trpc.adminAbout.updateTeamMember.useMutation({
    onSuccess: () => {
      utils.adminAbout.getAllTeam.invalidate();
      toast.success('Team member updated successfully');
      setTeamDialog(false);
      resetTeamForm();
    },
    onError: (error) => {
      toast.error('Error updating team member', { description: error.message });
    },
  });

  const deleteTeamMutation = trpc.adminAbout.deleteTeamMember.useMutation({
    onSuccess: () => {
      utils.adminAbout.getAllTeam.invalidate();
      toast.success('Team member deleted successfully');
    },
    onError: (error) => {
      toast.error('Error deleting team member', { description: error.message });
    },
  });

  const createAwardMutation = trpc.adminAbout.createAward.useMutation({
    onSuccess: () => {
      utils.adminAbout.getAllAwards.invalidate();
      toast.success('Award created successfully');
      setAwardDialog(false);
      resetAwardForm();
    },
    onError: (error) => {
      toast.error('Error creating award', { description: error.message });
    },
  });

  const updateAwardMutation = trpc.adminAbout.updateAward.useMutation({
    onSuccess: () => {
      utils.adminAbout.getAllAwards.invalidate();
      toast.success('Award updated successfully');
      setAwardDialog(false);
      resetAwardForm();
    },
    onError: (error) => {
      toast.error('Error updating award', { description: error.message });
    },
  });

  const deleteAwardMutation = trpc.adminAbout.deleteAward.useMutation({
    onSuccess: () => {
      utils.adminAbout.getAllAwards.invalidate();
      toast.success('Award deleted successfully');
    },
    onError: (error) => {
      toast.error('Error deleting award', { description: error.message });
    },
  });

  const uploadImageMutation = trpc.admin.uploadImage.useMutation();

  // Helper to get content value
  const getContentValue = (key: string) => {
    return contentData.find(c => c.sectionKey === key)?.sectionValue || '';
  };

  // Content form state
  const [heroTitle, setHeroTitle] = useState('');
  const [heroTagline, setHeroTagline] = useState('');
  const [storyIntro, setStoryIntro] = useState('');
  const [storyParagraph1, setStoryParagraph1] = useState('');
  const [storyParagraph2, setStoryParagraph2] = useState('');

  // Load content when data arrives
  useState(() => {
    if (contentData.length > 0) {
      setHeroTitle(getContentValue('hero_title'));
      setHeroTagline(getContentValue('hero_tagline'));
      setStoryIntro(getContentValue('story_intro'));
      setStoryParagraph1(getContentValue('story_paragraph1'));
      setStoryParagraph2(getContentValue('story_paragraph2'));
    }
  });

  // Value form state
  const [valueDialog, setValueDialog] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [valueForm, setValueForm] = useState({
    title: '',
    description: '',
    icon: '',
    displayOrder: 0,
    isActive: true,
  });

  const resetValueForm = () => {
    setValueForm({ title: '', description: '', icon: '', displayOrder: 0, isActive: true });
    setEditingValue(null);
  };

  // Team form state
  const [teamDialog, setTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [teamForm, setTeamForm] = useState({
    name: '',
    title: '',
    bio: '',
    imageUrl: '',
    displayOrder: 0,
    isActive: true,
  });
  const [uploadingTeamImage, setUploadingTeamImage] = useState(false);

  const resetTeamForm = () => {
    setTeamForm({ name: '', title: '', bio: '', imageUrl: '', displayOrder: 0, isActive: true });
    setEditingTeam(null);
  };

  // Award form state
  const [awardDialog, setAwardDialog] = useState(false);
  const [editingAward, setEditingAward] = useState<any>(null);
  const [awardForm, setAwardForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    year: new Date().getFullYear(),
    displayOrder: 0,
    isActive: true,
  });
  const [uploadingAwardImage, setUploadingAwardImage] = useState(false);

  const resetAwardForm = () => {
    setAwardForm({ title: '', description: '', imageUrl: '', year: new Date().getFullYear(), displayOrder: 0, isActive: true });
    setEditingAward(null);
  };

  // Handlers
  const handleSaveContent = async (key: string, value: string) => {
    await updateContentMutation.mutateAsync({ sectionKey: key, sectionValue: value });
  };

  const handleSaveAllContent = async () => {
    await Promise.all([
      handleSaveContent('hero_title', heroTitle),
      handleSaveContent('hero_tagline', heroTagline),
      handleSaveContent('story_intro', storyIntro),
      handleSaveContent('story_paragraph1', storyParagraph1),
      handleSaveContent('story_paragraph2', storyParagraph2),
    ]);
  };

  const handleEditValue = (value: any) => {
    setEditingValue(value);
    setValueForm({
      title: value.title,
      description: value.description,
      icon: value.icon,
      displayOrder: value.displayOrder,
      isActive: value.isActive,
    });
    setValueDialog(true);
  };

  const handleSaveValue = () => {
    if (editingValue) {
      updateValueMutation.mutate({ id: editingValue.id, ...valueForm });
    } else {
      createValueMutation.mutate(valueForm);
    }
  };

  const handleEditTeam = (member: any) => {
    setEditingTeam(member);
    setTeamForm({
      name: member.name,
      title: member.title,
      bio: member.bio,
      imageUrl: member.imageUrl || '',
      displayOrder: member.displayOrder,
      isActive: member.isActive,
    });
    setTeamDialog(true);
  };

  const handleSaveTeam = () => {
    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, ...teamForm });
    } else {
      createTeamMutation.mutate(teamForm);
    }
  };

  const handleTeamImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTeamImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await uploadImageMutation.mutateAsync({ file: base64, fileName: file.name, mimeType: file.type });
        setTeamForm({ ...teamForm, imageUrl: result.url });
        setUploadingTeamImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploadingTeamImage(false);
      toast.error('Error uploading image');
    }
  };

  const handleEditAward = (award: any) => {
    setEditingAward(award);
    setAwardForm({
      title: award.title,
      description: award.description || '',
      imageUrl: award.imageUrl || '',
      year: award.year || new Date().getFullYear(),
      displayOrder: award.displayOrder,
      isActive: award.isActive,
    });
    setAwardDialog(true);
  };

  const handleSaveAward = () => {
    if (editingAward) {
      updateAwardMutation.mutate({ id: editingAward.id, ...awardForm });
    } else {
      createAwardMutation.mutate(awardForm);
    }
  };

  const handleAwardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAwardImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await uploadImageMutation.mutateAsync({ file: base64, fileName: file.name, mimeType: file.type });
        setAwardForm({ ...awardForm, imageUrl: result.url });
        setUploadingAwardImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploadingAwardImage(false);
      toast.error('Error uploading image');
    }
  };

  if (loadingContent || loadingValues || loadingTeam || loadingAwards) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">About Page Content</h1>
            <p className="text-muted-foreground">Manage all content displayed on the About page</p>
          </div>

          <Tabs defaultValue="content" className="space-y-6">
            <TabsList>
              <TabsTrigger value="content">Hero & Story</TabsTrigger>
              <TabsTrigger value="values">Values</TabsTrigger>
              <TabsTrigger value="team">Team Members</TabsTrigger>
              <TabsTrigger value="awards">Awards</TabsTrigger>
            </TabsList>

            {/* Hero & Story Tab */}
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hero Section</CardTitle>
                  <CardDescription>Main heading and tagline at the top of the About page</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="heroTitle">Hero Title</Label>
                    <Input
                      id="heroTitle"
                      value={heroTitle}
                      onChange={(e) => setHeroTitle(e.target.value)}
                      placeholder="Our Story"
                    />
                  </div>
                  <div>
                    <Label htmlFor="heroTagline">Hero Tagline</Label>
                    <Textarea
                      id="heroTagline"
                      value={heroTagline}
                      onChange={(e) => setHeroTagline(e.target.value)}
                      placeholder="A journey from West Africa to the UK"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Story Section</CardTitle>
                  <CardDescription>Tell your restaurant's story</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="storyIntro">Story Introduction</Label>
                    <Textarea
                      id="storyIntro"
                      value={storyIntro}
                      onChange={(e) => setStoryIntro(e.target.value)}
                      placeholder="Introduction paragraph"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="storyParagraph1">Story Paragraph 1</Label>
                    <Textarea
                      id="storyParagraph1"
                      value={storyParagraph1}
                      onChange={(e) => setStoryParagraph1(e.target.value)}
                      placeholder="First paragraph of your story"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="storyParagraph2">Story Paragraph 2</Label>
                    <Textarea
                      id="storyParagraph2"
                      value={storyParagraph2}
                      onChange={(e) => setStoryParagraph2(e.target.value)}
                      placeholder="Second paragraph of your story"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSaveAllContent} disabled={updateContentMutation.isPending}>
                {updateContentMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save All Content</>
                )}
              </Button>
            </TabsContent>

            {/* Values Tab */}
            <TabsContent value="values" className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Manage the values displayed on the About page</p>
                <Dialog open={valueDialog} onOpenChange={setValueDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetValueForm}>
                      <Plus className="w-4 h-4 mr-2" /> Add Value
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingValue ? 'Edit Value' : 'Add New Value'}</DialogTitle>
                      <DialogDescription>
                        {editingValue ? 'Update the value details' : 'Add a new value to the About page'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="valueTitle">Title</Label>
                        <Input
                          id="valueTitle"
                          value={valueForm.title}
                          onChange={(e) => setValueForm({ ...valueForm, title: e.target.value })}
                          placeholder="Authenticity"
                        />
                      </div>
                      <div>
                        <Label htmlFor="valueDescription">Description</Label>
                        <Textarea
                          id="valueDescription"
                          value={valueForm.description}
                          onChange={(e) => setValueForm({ ...valueForm, description: e.target.value })}
                          placeholder="We stay true to traditional recipes..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="valueIcon">Icon (Lucide icon name)</Label>
                        <Input
                          id="valueIcon"
                          value={valueForm.icon}
                          onChange={(e) => setValueForm({ ...valueForm, icon: e.target.value })}
                          placeholder="Heart"
                        />
                      </div>
                      <div>
                        <Label htmlFor="valueOrder">Display Order</Label>
                        <Input
                          id="valueOrder"
                          type="number"
                          value={valueForm.displayOrder}
                          onChange={(e) => setValueForm({ ...valueForm, displayOrder: parseInt(e.target.value) })}
                        />
                      </div>
                      {editingValue && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="valueActive"
                            checked={valueForm.isActive}
                            onCheckedChange={(checked) => setValueForm({ ...valueForm, isActive: checked })}
                          />
                          <Label htmlFor="valueActive">Active</Label>
                        </div>
                      )}
                      <Button onClick={handleSaveValue} className="w-full">
                        {editingValue ? 'Update Value' : 'Create Value'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {valuesData.map((value: any) => (
                  <Card key={value.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{value.title}</h3>
                        <p className="text-sm text-muted-foreground">{value.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Icon: {value.icon} | Order: {value.displayOrder}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditValue(value)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteValueMutation.mutate({ id: value.id })}
                          disabled={deleteValueMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Manage team members displayed on the About page</p>
                <Dialog open={teamDialog} onOpenChange={setTeamDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetTeamForm}>
                      <Plus className="w-4 h-4 mr-2" /> Add Team Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingTeam ? 'Edit Team Member' : 'Add New Team Member'}</DialogTitle>
                      <DialogDescription>
                        {editingTeam ? 'Update the team member details' : 'Add a new team member to the About page'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="teamName">Name</Label>
                        <Input
                          id="teamName"
                          value={teamForm.name}
                          onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamTitle">Title/Position</Label>
                        <Input
                          id="teamTitle"
                          value={teamForm.title}
                          onChange={(e) => setTeamForm({ ...teamForm, title: e.target.value })}
                          placeholder="Head Chef"
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamBio">Bio</Label>
                        <Textarea
                          id="teamBio"
                          value={teamForm.bio}
                          onChange={(e) => setTeamForm({ ...teamForm, bio: e.target.value })}
                          placeholder="Brief biography..."
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamImage">Photo</Label>
                        <div className="flex items-center gap-4">
                          {teamForm.imageUrl && (
                            <div className="relative">
                              <img src={teamForm.imageUrl} alt="Preview" className="w-20 h-20 object-cover rounded" />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                onClick={() => setTeamForm({ ...teamForm, imageUrl: '' })}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          <Input
                            id="teamImage"
                            type="file"
                            accept="image/*"
                            onChange={handleTeamImageUpload}
                            disabled={uploadingTeamImage}
                          />
                          {uploadingTeamImage && <Loader2 className="w-4 h-4 animate-spin" />}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="teamOrder">Display Order</Label>
                        <Input
                          id="teamOrder"
                          type="number"
                          value={teamForm.displayOrder}
                          onChange={(e) => setTeamForm({ ...teamForm, displayOrder: parseInt(e.target.value) })}
                        />
                      </div>
                      {editingTeam && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="teamActive"
                            checked={teamForm.isActive}
                            onCheckedChange={(checked) => setTeamForm({ ...teamForm, isActive: checked })}
                          />
                          <Label htmlFor="teamActive">Active</Label>
                        </div>
                      )}
                      <Button onClick={handleSaveTeam} className="w-full">
                        {editingTeam ? 'Update Team Member' : 'Create Team Member'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {teamData.map((member: any) => (
                  <Card key={member.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4 flex-1">
                        {member.imageUrl && (
                          <img src={member.imageUrl} alt={member.name} className="w-16 h-16 object-cover rounded" />
                        )}
                        <div>
                          <h3 className="font-semibold">{member.name}</h3>
                          <p className="text-sm text-muted-foreground">{member.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">Order: {member.displayOrder}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditTeam(member)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteTeamMutation.mutate({ id: member.id })}
                          disabled={deleteTeamMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Awards Tab */}
            <TabsContent value="awards" className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Manage awards and recognition displayed on the About page</p>
                <Dialog open={awardDialog} onOpenChange={setAwardDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetAwardForm}>
                      <Plus className="w-4 h-4 mr-2" /> Add Award
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingAward ? 'Edit Award' : 'Add New Award'}</DialogTitle>
                      <DialogDescription>
                        {editingAward ? 'Update the award details' : 'Add a new award to the About page'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="awardTitle">Title</Label>
                        <Input
                          id="awardTitle"
                          value={awardForm.title}
                          onChange={(e) => setAwardForm({ ...awardForm, title: e.target.value })}
                          placeholder="Best African Restaurant 2024"
                        />
                      </div>
                      <div>
                        <Label htmlFor="awardDescription">Description</Label>
                        <Textarea
                          id="awardDescription"
                          value={awardForm.description}
                          onChange={(e) => setAwardForm({ ...awardForm, description: e.target.value })}
                          placeholder="Awarded by..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="awardYear">Year</Label>
                        <Input
                          id="awardYear"
                          type="number"
                          value={awardForm.year}
                          onChange={(e) => setAwardForm({ ...awardForm, year: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="awardImage">Image</Label>
                        <div className="flex items-center gap-4">
                          {awardForm.imageUrl && (
                            <div className="relative">
                              <img src={awardForm.imageUrl} alt="Preview" className="w-20 h-20 object-cover rounded" />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                onClick={() => setAwardForm({ ...awardForm, imageUrl: '' })}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          <Input
                            id="awardImage"
                            type="file"
                            accept="image/*"
                            onChange={handleAwardImageUpload}
                            disabled={uploadingAwardImage}
                          />
                          {uploadingAwardImage && <Loader2 className="w-4 h-4 animate-spin" />}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="awardOrder">Display Order</Label>
                        <Input
                          id="awardOrder"
                          type="number"
                          value={awardForm.displayOrder}
                          onChange={(e) => setAwardForm({ ...awardForm, displayOrder: parseInt(e.target.value) })}
                        />
                      </div>
                      {editingAward && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="awardActive"
                            checked={awardForm.isActive}
                            onCheckedChange={(checked) => setAwardForm({ ...awardForm, isActive: checked })}
                          />
                          <Label htmlFor="awardActive">Active</Label>
                        </div>
                      )}
                      <Button onClick={handleSaveAward} className="w-full">
                        {editingAward ? 'Update Award' : 'Create Award'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {awardsData.map((award: any) => (
                  <Card key={award.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4 flex-1">
                        {award.imageUrl && (
                          <img src={award.imageUrl} alt={award.title} className="w-16 h-16 object-cover rounded" />
                        )}
                        <div>
                          <h3 className="font-semibold">{award.title}</h3>
                          <p className="text-sm text-muted-foreground">{award.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">Year: {award.year} | Order: {award.displayOrder}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditAward(award)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAwardMutation.mutate({ id: award.id })}
                          disabled={deleteAwardMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
