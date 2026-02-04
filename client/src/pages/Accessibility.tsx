import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Accessibility() {
  const { data: page, isLoading } = trpc.legal.getByType.useQuery({ pageType: 'accessibility' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!page || !page.isPublished) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Accessibility Statement</h1>
            <p className="text-muted-foreground">This page is currently unavailable. Please check back later.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="bg-black text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold">{page.title}</h1>
          <p className="text-gray-400 mt-4">Last updated: {new Date(page.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto prose prose-lg dark:prose-invert">
          <ReactMarkdown>{page.content}</ReactMarkdown>
        </div>
      </div>
      <Footer />
    </div>
  );
}
