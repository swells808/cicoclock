import { PRODUCTION_BASE_URL } from "@/lib/constants";

/**
 * Generates a badge URL for a given profile ID.
 * Always uses the production base URL (cicotimeclock.com)
 * to ensure QR codes work regardless of where they're generated.
 * 
 * Note: The timeclock scanner extracts the profile ID from URLs,
 * so it will work correctly regardless of the domain used.
 */
export function getBadgeUrl(profileId: string): string {
  return `${PRODUCTION_BASE_URL}/badge/${profileId}`;
}
