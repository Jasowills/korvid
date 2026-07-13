import { z } from "zod";

const analyzeParams = z.object({
  imagePath: z.string().describe("Path to image file"),
  prompt: z.string().optional().describe("Question about the image"),
});

const ocrParams = z.object({
  imagePath: z.string().describe("Path to image file to extract text from"),
});

const screenDescribeParams = z.object({
  prompt: z.string().optional().describe("What to look for on screen"),
});

export const analyzeImageSchema = analyzeParams;
export const ocrSchema = ocrParams;
export const screenDescribeSchema = screenDescribeParams;
