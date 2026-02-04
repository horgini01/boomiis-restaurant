import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Star } from 'lucide-react';

interface ReviewsSectionProps {
  menuItemId: number;
  menuItemName: string;
}

export function ReviewsSection({ menuItemId, menuItemName }: ReviewsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    comment: '',
  });

  const { data: reviews, refetch } = trpc.reviews.getByMenuItem.useQuery({ menuItemId });
  const { data: ratingData } = trpc.reviews.getAverageRating.useQuery({ menuItemId });
  const createReview = trpc.reviews.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!formData.customerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await createReview.mutateAsync({
        menuItemId,
        rating,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || undefined,
        comment: formData.comment || undefined,
      });

      toast.success('Thank you for your review! It will be published after moderation.');
      setFormData({ customerName: '', customerEmail: '', comment: '' });
      setRating(0);
      setShowForm(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    }
  };

  const StarRating = ({ value, interactive = false }: { value: number; interactive?: boolean }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`w-5 h-5 ${
                star <= (interactive ? (hoverRating || rating) : value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Average Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold">{ratingData?.averageRating || 0}</div>
            <div>
              <StarRating value={ratingData?.averageRating || 0} />
              <p className="text-sm text-muted-foreground mt-1">
                Based on {ratingData?.totalReviews || 0} reviews
              </p>
            </div>
          </div>

          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="w-full">
              Write a Review
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Review Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Write Your Review for {menuItemName}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Your Rating *</Label>
                <StarRating value={rating} interactive />
              </div>

              <div>
                <Label htmlFor="customerName">Your Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="customerEmail">Email (optional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="comment">Your Review (optional)</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Tell us what you think about this dish..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createReview.isPending}>
                  {createReview.isPending ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews && reviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Customer Feedback</h3>
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{review.customerName}</p>
                    <StarRating value={review.rating} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {review.comment && <p className="text-muted-foreground mt-2">{review.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reviews && reviews.length === 0 && !showForm && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>No reviews yet. Be the first to review {menuItemName}!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
