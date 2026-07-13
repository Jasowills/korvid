export const INTEGRATIONS_VERSION = "0.1.0";

export { createCalendarClient, type CalendarClient, type CalendarEvent, type CalendarProvider } from "./calendar.js";
export { createEmailClient, type EmailClient, type EmailMessage, type EmailProvider } from "./email.js";
export { createIntegrationManager, type IntegrationManager } from "./manager.js";
