import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';

export default function SubmitTestimonial() {
  const { restaurantName } = useSettings();
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    content: '',
    rating: 5,
  });
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.testimonials.submit.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSubmitted(true);
      setFormData({
        customerName: '',
        customerEmail: '',
        content: '',
        rating: 5,
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit testimonial');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const handleRatingClick = (rating: number) => {
    setFormData({ ...formData, rating });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <a href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">{restaurantName}</span>
          </a>
          <nav className="flex gap-6">
            <a href="/" className="text-sm font-medium hover:text-primary transition-colors">
              Home
            </a>
            <a href="/menu" className="text-sm font-medium hover:text-primary transition-colors">
              Menu
            </a>
            <a href="/contact" className="text-sm font-medium hover:text-primary transition-colors">
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Share Your Experience</h1>
            <p className="text-lg text-muted-foreground">
              We'd love to hear about your experience at {restaurantName}. Your feedback helps us improve and lets others know what to expect.
            </p>
          </div>

          {submitted ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-center text-2xl">Thank You!</CardTitle>
                <CardDescription className="text-center text-base">
                  Your testimonial has been submitted and is awaiting approval. We appreciate you taking the time to share your experience!
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center gap-4">
                <Button onClick={() => setSubmitted(false)} variant="outline">
                  Submit Another
                </Button>
                <Button onClick={() => window.location.href = '/'}>
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your Testimonial</CardTitle>
                <CardDescription>
                  All fields marked with * are required
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="John Doe"
                      required
                      minLength={2}
                    />
                  </div>

                  {/* Email (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      placeholder="john@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll never share your email publicly
                    </p>
                  </div>

                  {/* Rating */}
                  <div className="space-y-2">
                    <Label>Rating *</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingClick(star)}
                          className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= formData.rating
                                ? 'fill-primary text-primary'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formData.rating === 5 && 'Excellent!'}
                      {formData.rating === 4 && 'Very Good'}
                      {formData.rating === 3 && 'Good'}
                      {formData.rating === 2 && 'Fair'}
                      {formData.rating === 1 && 'Poor'}
                    </p>
                  </div>

                  {/* Testimonial Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content">Your Testimonial *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Tell us about your experience..."
                      required
                      minLength={10}
                      rows={6}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum 10 characters
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? 'Submitting...' : 'Submit Testimonial'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.location.href = '/'}
                    >
                      Cancel
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Your testimonial will be reviewed by our team before being published on our website.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {restaurantName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
