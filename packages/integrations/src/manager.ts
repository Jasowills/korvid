import type { KorvidConfig } from "@korvid/shared";
import { createCalendarClient, type CalendarClient, type CalendarEvent } from "./calendar.js";
import { createEmailClient, type EmailClient, type EmailMessage } from "./email.js";

export interface IntegrationManager {
  getCalendar(): CalendarClient;
  getEmail(): EmailClient;
  getDailySummary(): Promise<string>;
  getActionItems(): Promise<string[]>;
}

export function createIntegrationManager(config: KorvidConfig): IntegrationManager {
  const calendar = createCalendarClient(config);
  const email = createEmailClient(config);

  return {
    getCalendar() { return calendar; },
    getEmail() { return email; },

    async getDailySummary(): Promise<string> {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const events = await calendar.listEvents(now, endOfDay);
      const unreadCount = await email.getUnreadCount();

      let summary = "";
      if (events.length > 0) {
        summary += `Today you have ${events.length} event${events.length > 1 ? "s" : ""}:\n`;
        for (const event of events) {
          const time = event.allDay ? "All day" : event.start.toLocaleTimeString();
          summary += `  - ${event.title} at ${time}\n`;
        }
      } else {
        summary += "No events scheduled for today.\n";
      }

      if (unreadCount > 0) {
        summary += `\nYou have ${unreadCount} unread email${unreadCount > 1 ? "s" : ""}.`;
      }

      return summary;
    },

    async getActionItems(): Promise<string[]> {
      const items: string[] = [];

      // Check for upcoming events that need preparation
      const upcoming = await calendar.getUpcoming(5);
      for (const event of upcoming) {
        const hoursUntil = (event.start.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil < 24 && event.description) {
          items.push(`Prepare for: ${event.title} (${Math.round(hoursUntil)}h)`);
        }
      }

      // Check for important emails
      const importantEmails = await email.listMessages({ unreadOnly: true, limit: 5 });
      for (const msg of importantEmails) {
        if (msg.important) {
          items.push(`Important email from ${msg.from}: ${msg.subject}`);
        }
      }

      return items;
    },
  };
}
