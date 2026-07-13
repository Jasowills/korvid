import { z } from "zod";

export const navigateSchema = z.object({
  url: z.string().url().describe("URL to navigate to"),
});

export const clickSchema = z.object({
  selector: z.string().describe("CSS selector for element to click"),
});

export const typeSchema = z.object({
  selector: z.string().describe("CSS selector for input element"),
  text: z.string().describe("Text to type"),
});

export const getTextSchema = z.object({
  selector: z.string().describe("CSS selector for element to extract text from"),
});

export const screenshotSchema = z.object({
  path: z.string().optional().describe("Path to save screenshot"),
});
