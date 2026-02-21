import { MessageCircle } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { trpc } from '@/lib/trpc';

export default function WhatsAppButton() {
  const { contactPhone } = useSettings();
  const { data: whatsappEnabled, isLoading } = trpc.settings.getWhatsAppEnabled.useQuery();

  // Don't render if disabled or no phone number
  if (isLoading || !whatsappEnabled || !contactPhone) {
    return null;
  }

  // Format phone number for WhatsApp (remove spaces, dashes, and add country code if needed)
  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 0 (UK format), replace with 44
    if (cleaned.startsWith('0')) {
      cleaned = '44' + cleaned.substring(1);
    }
    
    return cleaned;
  };

  const whatsappNumber = formatPhoneForWhatsApp(contactPhone);
  const message = encodeURIComponent("Hi Boomiis! I'd like to inquire about...");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[9999] flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 animate-bounce-subtle"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
