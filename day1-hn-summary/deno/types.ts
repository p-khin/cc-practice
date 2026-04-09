import { z } from "zod";

// Raw HN API item (validated on receipt)
export const HNItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  url: z.string().url().optional(),
  score: z.number(),
  descendants: z.number().optional(),
  type: z.string().optional(),
});

export type HNItem = z.infer<typeof HNItemSchema>;

// Normalized article used throughout the app
export const ArticleSchema = z.object({
  rank: z.number().int().positive(),
  id: z.number().int().positive(),
  title: z.string().min(1),
  url: z.string().url(),
  score: z.number().int().min(0),
  comments: z.number().int().min(0),
});

export type Article = z.infer<typeof ArticleSchema>;

export type Format = "markdown" | "html" | "json";

export interface SummaryOptions {
  categorize: boolean;
  minComments: number;
  format: Format;
}

export class OptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptionsError";
  }
}
