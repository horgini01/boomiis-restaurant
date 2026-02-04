import { trpc } from '@/lib/trpc';
import { useRoute, Link } from 'wouter';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Streamdown } from 'streamdown';

export function BlogArticle() {
  const [, params] = useRoute('/blog/:slug');
  const slug = params?.slug || '';

  const { data: post, isLoading, error } = trpc.blog.getBySlug.useQuery({ slug }, {
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading article...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900 to-orange-800 text-white py-12">
        <div className="container mx-auto px-4">
          <Link href="/blog">
            <Button variant="ghost" className="text-white hover:bg-white/20 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>

      {/* Article */}
      <div className="container mx-auto px-4 py-12">
        <article className="max-w-4xl mx-auto">
          {/* Featured Image */}
          {post.featuredImage && (
            <div className="aspect-video overflow-hidden rounded-lg mb-8">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>

          {/* Meta */}
          <div className="flex items-center gap-6 text-muted-foreground mb-8 pb-8 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Draft'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <span>Admin</span>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <Streamdown>{post.content}</Streamdown>
          </div>
        </article>
      </div>
    </div>
  );
}
