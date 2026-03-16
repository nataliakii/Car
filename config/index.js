/**
 * 📦 config
 *
 * Application configuration.
 * 
 * ⚠️ IMPORTANT: Most data comes from MongoDB.
 * Only COMPANY_ID is hardcoded here.
 */

// Company ID — the ONLY hardcoded value
export { COMPANY_ID } from "./company";

// API paths — single source for internal route paths
export { API_PATHS } from "./apiPaths";

// Booking rules — FALLBACK values (real values from MongoDB)
export { BOOKING_RULES } from "./bookingRules";

// Email configuration
export { DEVELOPER_EMAIL } from "./email";
