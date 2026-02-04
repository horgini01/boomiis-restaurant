import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import Header from '@/components/Header';
import { Calendar, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function Blog() {
  const { data: posts, isLoading } = trpc.blog.list.useQuery({ limit: 20 });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Page Header */}
      <div className="bg-gradient-to-r from-orange-900 to-orange-800 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4">Blog</h1>
          <p className="text-xl text-gray-200">
            Stories, recipes, and insights from our kitchen
          </p>
        </div>
      </div>

      {/* Blog Posts */}
      <div className="container mx-auto px-4 py-16">
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        )}

        {!isLoading && posts && posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
          </div>
        )}

        {!isLoading && posts && posts.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  {post.featuredImage && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold mb-3 line-clamp-2">{post.title}</h2>
                    {post.excerpt && (
                      <p className="text-muted-foreground mb-4 line-clamp-3">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString()
                            : 'Draft'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>Admin</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
