import { trpc } from "@/lib/trpc";
import { DEFAULT_OPENING_HOURS } from "@shared/constants/openingHours";

export function useSettings() {
  const { data: settings, isLoading } = trpc.settings.getPublic.useQuery();
  const { data: openingHoursData } = trpc.settings.getPublicOpeningHours.useQuery();

  const formatOpeningHoursDisplay = () => {
    // Use default hours if database has no data
    const hoursToDisplay = (openingHoursData && openingHoursData.length > 0) 
      ? openingHoursData 
      : DEFAULT_OPENING_HOURS;
    
    if (!hoursToDisplay || hoursToDisplay.length === 0) {
      return ["Hours not available"];
    }

    // Group consecutive days with same hours
    const grouped: string[] = [];
    let currentGroup: any[] = [];

    hoursToDisplay.forEach((hour, index) => {
      if (hour.isClosed) {
        if (currentGroup.length > 0) {
          grouped.push(formatGroup(currentGroup));
          currentGroup = [];
        }
        grouped.push(`${hour.dayName}: Closed`);
      } else {
        if (
          currentGroup.length === 0 ||
          (currentGroup[0].openTime === hour.openTime && currentGroup[0].closeTime === hour.closeTime)
        ) {
          currentGroup.push(hour);
        } else {
          grouped.push(formatGroup(currentGroup));
          currentGroup = [hour];
        }
      }

      if (index === hoursToDisplay.length - 1 && currentGroup.length > 0) {
        grouped.push(formatGroup(currentGroup));
      }
    });

    return grouped;
  };

  const formatGroup = (group: any[]) => {
    if (group.length === 1) {
      return `${group[0].dayName}: ${formatTime(group[0].openTime)} - ${formatTime(group[0].closeTime)}`;
    }
    return `${group[0].dayName}-${group[group.length - 1].dayName}: ${formatTime(group[0].openTime)} - ${formatTime(group[0].closeTime)}`;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    // Keep 00 for midnight hour instead of converting to 12
    const displayHour = hour === 0 ? "00" : hour > 12 ? hour - 12 : hour;
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
    restaurantLatitude: parseFloat(settings?.restaurant_latitude || "50.470180"),
    restaurantLongitude: parseFloat(settings?.restaurant_longitude || "-3.537695"),
    socialFacebook: settings?.social_facebook || "",
    socialInstagram: settings?.social_instagram || "",
    socialTwitter: settings?.social_twitter || "",
    openingHours: openingHoursData && openingHoursData.length > 0 ? openingHoursData : DEFAULT_OPENING_HOURS,
    openingHoursDisplay: formatOpeningHoursDisplay(),
  };
}
