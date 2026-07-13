import type { ToolDefinition } from "./reasoning.js";
import type { IntegrationManager } from "@korvid/integrations";

export interface IntegrationToolDeps {
  manager: IntegrationManager;
}

export function createIntegrationTools(deps: IntegrationToolDeps): ToolDefinition[] {
  return [
    {
      type: "function",
      function: {
        name: "get_daily_summary",
        description: "Get a summary of today's calendar events and unread emails",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_upcoming_events",
        description: "Get upcoming calendar events",
        parameters: {
          type: "object",
          properties: {
            hours: {
              type: "number",
              description: "Number of hours to look ahead (default: 24)",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_unread_emails",
        description: "Get a list of unread emails",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of emails to return (default: 5)",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_calendar",
        description: "Search for calendar events by title or description",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for event title or description",
            },
            days: {
              type: "number",
              description: "Number of days to search (default: 7)",
            },
          },
          required: ["query"],
        },
      },
    },
  ];
}

export async function executeIntegrationTool(
  deps: IntegrationToolDeps,
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const { manager } = deps;

  switch (toolName) {
    case "get_daily_summary": {
      return await manager.getDailySummary();
    }

    case "get_upcoming_events": {
      const hours = (args.hours as number) || 24;
      const events = await manager.getCalendar().getUpcoming(hours);
      if (events.length === 0) {
        return "No upcoming events found.";
      }
      return events
        .map((e: { title: string; start: Date; allDay?: boolean }) => {
          const time = e.allDay ? "All day" : e.start.toLocaleTimeString();
          return `- ${e.title} at ${time}`;
        })
        .join("\n");
    }

    case "get_unread_emails": {
      const limit = (args.limit as number) || 5;
      const emails = await manager.getEmail().listMessages({ unreadOnly: true, limit });
      if (emails.length === 0) {
        return "No unread emails.";
      }
      return emails
        .map((e: { from: string; subject: string }) => `- From: ${e.from}, Subject: ${e.subject}`)
        .join("\n");
    }

    case "search_calendar": {
      const query = args.query as string;
      const days = (args.days as number) || 7;
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + days);
      const events = await manager.getCalendar().listEvents(now, endDate);
      const filtered = events.filter(
        (e: { title: string; description?: string }) =>
          e.title.toLowerCase().includes(query.toLowerCase()) ||
          (e.description?.toLowerCase().includes(query.toLowerCase()) ?? false)
      );
      if (filtered.length === 0) {
        return `No events found matching "${query}".`;
      }
      return filtered
        .map((e: { title: string; start: Date; allDay?: boolean }) => {
          const time = e.allDay ? "All day" : e.start.toLocaleTimeString();
          return `- ${e.title} at ${time}`;
        })
        .join("\n");
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}
