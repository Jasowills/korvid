import { describe, it, expect, vi } from "vitest";
import { createIntegrationTools, executeIntegrationTool } from "./integration-tools.js";

describe("IntegrationTools", () => {
  const calendar = {
    listEvents: vi.fn().mockResolvedValue([
      { title: "Team Meeting", start: new Date("2025-01-15T10:00:00"), allDay: false },
      { title: "Lunch", start: new Date("2025-01-15T12:00:00"), allDay: true },
    ]),
    getUpcoming: vi.fn().mockResolvedValue([
      { title: "Team Meeting", start: new Date("2025-01-15T10:00:00"), allDay: false },
    ]),
  };
  const email = {
    listMessages: vi.fn().mockResolvedValue([
      { from: "alice@example.com", subject: "Project Update" },
      { from: "bob@example.com", subject: "Meeting Notes" },
    ]),
    getUnreadCount: vi.fn().mockResolvedValue(2),
  };
  const mockManager = {
    getCalendar: () => calendar,
    getEmail: () => email,
    getDailySummary: vi.fn().mockResolvedValue("Today you have 2 events:\n  - Team Meeting at 10:00 AM\n  - Lunch at All day"),
    getActionItems: vi.fn().mockResolvedValue(["Prepare for: Team Meeting (2h)"]),
  } as any;

  it("creates integration tools with correct structure", () => {
    const tools = createIntegrationTools({ manager: mockManager });
    expect(tools).toHaveLength(4);
    expect(tools[0].type).toBe("function");
    expect(tools[0].function.name).toBe("get_daily_summary");
    expect(tools[1].function.name).toBe("get_upcoming_events");
    expect(tools[2].function.name).toBe("get_unread_emails");
    expect(tools[3].function.name).toBe("search_calendar");
  });

  it("executes get_daily_summary tool", async () => {
    const result = await executeIntegrationTool({ manager: mockManager }, "get_daily_summary", {});
    expect(result).toContain("2 events");
    expect(mockManager.getDailySummary).toHaveBeenCalled();
  });

  it("executes get_upcoming_events tool", async () => {
    const result = await executeIntegrationTool({ manager: mockManager }, "get_upcoming_events", { hours: 12 });
    expect(result).toContain("Team Meeting");
    expect(mockManager.getCalendar().getUpcoming).toHaveBeenCalledWith(12);
  });

  it("executes get_unread_emails tool", async () => {
    const result = await executeIntegrationTool({ manager: mockManager }, "get_unread_emails", { limit: 10 });
    expect(result).toContain("alice@example.com");
    expect(mockManager.getEmail().listMessages).toHaveBeenCalledWith({ unreadOnly: true, limit: 10 });
  });

  it("executes search_calendar tool", async () => {
    const result = await executeIntegrationTool({ manager: mockManager }, "search_calendar", { query: "meeting", days: 7 });
    expect(result).toContain("Team Meeting");
  });

  it("returns unknown tool error for invalid tool", async () => {
    const result = await executeIntegrationTool({ manager: mockManager }, "invalid_tool", {});
    expect(result).toBe("Unknown tool: invalid_tool");
  });
});
