import { PRODUCTION_BASE_URL } from "@/lib/constants";

/**
 * Generates a badge URL for a given profile ID.
 * In production, always uses the production base URL (cicotimeclock.com)
 * to ensure QR codes work regardless of how the app is accessed.
 */
export function getBadgeUrl(profileId: string): string {
  const baseUrl = import.meta.env.PROD 
    ? PRODUCTION_BASE_URL 
    : window.location.origin;
  
  return `${baseUrl}/badge/${profileId}`;
}
