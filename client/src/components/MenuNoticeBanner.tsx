import { trpc } from '@/lib/trpc';
import { Info } from 'lucide-react';

export default function MenuNoticeBanner() {
  const { data, isLoading } = trpc.settings.getMenuNotice.useQuery();

  // Don't render if loading, disabled, or no text
  if (isLoading || !data?.enabled || !data?.text) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex gap-3">
        <Info className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
        <p className="text-sm text-amber-900 leading-relaxed">{data.text}</p>
      </div>
    </div>
  );
}
