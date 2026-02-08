import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Star, Check, Trash2 } from 'lucide-react';

export function ReviewsManagement() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  const { data: reviews, refetch } = trpc.reviews.list.useQuery({ status: statusFilter });
  const approveReview = trpc.reviews.approve.useMutation();
  const deleteReview = trpc.reviews.delete.useMutation();

  const handleApprove = async (id: number) => {
    try {
      await approveReview.mutateAsync({ id });
      toast.success('Review approved');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve review');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      await deleteReview.mutateAsync({ id });
      toast.success('Review deleted');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete review');
    }
  };

  const StarRating = ({ rating }: { rating: number }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    
      <AdminLayout>
        <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews Management</CardTitle>
          <div className="flex gap-2 mt-4">
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('approved')}
            >
              Approved
            </Button>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!reviews || reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reviews found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu Item</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>Item #{review.menuItemId}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{review.customerName}</div>
                        {review.customerEmail && (
                          <div className="text-sm text-muted-foreground">{review.customerEmail}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StarRating rating={review.rating} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="line-clamp-2">{review.comment || '-'}</div>
                    </TableCell>
                    <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          review.isApproved
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {review.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!review.isApproved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(review.id)}
                            disabled={approveReview.isPending}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(review.id)}
                          disabled={deleteReview.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
      </AdminLayout>
    
  );
}
