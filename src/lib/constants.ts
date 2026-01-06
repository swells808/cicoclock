export const APP_NAME = "CICO";
export const APP_DESCRIPTION = "Time Tracking Made Simple";

// Production base URL for badge QR codes - always use the custom domain
export const PRODUCTION_BASE_URL = "https://clock.cicotimeclock.com";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  COMPANY_SIGNUP: "/company-signup",
  DASHBOARD: "/dashboard",
  TIMECLOCK: "/timeclock",
  USERS: "/users",
  PROJECTS: "/projects",
  CLIENTS: "/clients",
  REPORTS: "/reports",
  SETTINGS: "/settings",
  ABOUT: "/about",
  FEATURES: "/features",
  PRICING: "/pricing",
  CONTACT: "/contact",
  PRIVACY: "/privacy",
  PUBLIC_BADGE: "/badge/:id",
} as const;

export const USER_ROLES = {
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  EMPLOYEE: "employee",
  FOREMAN: "foreman",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
