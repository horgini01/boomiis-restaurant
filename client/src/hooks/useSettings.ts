import { trpc } from "@/lib/trpc";

export function useSettings() {
  const { data: settings, isLoading } = trpc.settings.getPublic.useQuery();

  const parseOpeningHours = (jsonString: string | undefined) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };

  const formatOpeningHours = () => {
    const hours = parseOpeningHours(settings?.opening_hours);
    if (!hours) return [];

    return Object.entries(hours).map(([day, times]: [string, any]) => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      open: times.open,
      close: times.close,
      closed: times.closed,
    }));
  };

  const formatOpeningHoursDisplay = () => {
    const hours = formatOpeningHours();
    if (hours.length === 0) return "Hours not available";

    // Group consecutive days with same hours
    const grouped: string[] = [];
    let currentGroup: any[] = [];

    hours.forEach((hour, index) => {
      if (hour.closed) {
        if (currentGroup.length > 0) {
          grouped.push(formatGroup(currentGroup));
          currentGroup = [];
        }
        grouped.push(`${hour.day}: Closed`);
      } else {
        if (
          currentGroup.length === 0 ||
          (currentGroup[0].open === hour.open && currentGroup[0].close === hour.close)
        ) {
          currentGroup.push(hour);
        } else {
          grouped.push(formatGroup(currentGroup));
          currentGroup = [hour];
        }
      }

      if (index === hours.length - 1 && currentGroup.length > 0) {
        grouped.push(formatGroup(currentGroup));
      }
    });

    return grouped;
  };

  const formatGroup = (group: any[]) => {
    if (group.length === 1) {
      return `${group[0].day}: ${formatTime(group[0].open)} - ${formatTime(group[0].close)}`;
    }
    return `${group[0].day}-${group[group.length - 1].day}: ${formatTime(group[0].open)} - ${formatTime(group[0].close)}`;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return {
    settings: settings || {},
    isLoading,
    restaurantName: settings?.restaurant_name || "Boomiis",
    restaurantTagline: settings?.restaurant_tagline || "Authentic African Cuisine",
    restaurantLogo: settings?.restaurant_logo || "",
    contactAddress: settings?.contact_address || "",
    contactPhone: settings?.contact_phone || "",
    contactEmail: settings?.contact_email || "",
    socialFacebook: settings?.social_facebook || "",
    socialInstagram: settings?.social_instagram || "",
    socialTwitter: settings?.social_twitter || "",
    openingHours: formatOpeningHours(),
    openingHoursDisplay: formatOpeningHoursDisplay(),
  };
}
