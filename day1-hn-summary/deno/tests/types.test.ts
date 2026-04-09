import { assertEquals } from "jsr:@std/assert";
import { HNItemSchema, ArticleSchema } from "../types.ts";

// ── HNItemSchema ──────────────────────────────────────────────────────────

Deno.test("HNItemSchema: valid full item", () => {
  const result = HNItemSchema.safeParse({
    id: 123,
    title: "Test Article",
    url: "https://example.com",
    score: 100,
    descendants: 50,
    type: "story",
  });
  assertEquals(result.success, true);
});

Deno.test("HNItemSchema: valid item without optional fields", () => {
  const result = HNItemSchema.safeParse({
    id: 456,
    title: "No URL Article",
    score: 42,
  });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.url, undefined);
    assertEquals(result.data.descendants, undefined);
  }
});

Deno.test("HNItemSchema: missing required title → invalid", () => {
  const result = HNItemSchema.safeParse({ id: 789, score: 10 });
  assertEquals(result.success, false);
});

Deno.test("HNItemSchema: missing required id → invalid", () => {
  const result = HNItemSchema.safeParse({ title: "No ID", score: 10 });
  assertEquals(result.success, false);
});

Deno.test("HNItemSchema: missing required score → invalid", () => {
  const result = HNItemSchema.safeParse({ id: 1, title: "No Score" });
  assertEquals(result.success, false);
});

Deno.test("HNItemSchema: invalid url format → invalid", () => {
  const result = HNItemSchema.safeParse({
    id: 1,
    title: "Bad URL",
    score: 10,
    url: "not-a-url",
  });
  assertEquals(result.success, false);
});

Deno.test("HNItemSchema: non-number id → invalid", () => {
  const result = HNItemSchema.safeParse({
    id: "abc",
    title: "Bad ID",
    score: 10,
  });
  assertEquals(result.success, false);
});

// ── ArticleSchema ─────────────────────────────────────────────────────────

Deno.test("ArticleSchema: valid article", () => {
  const result = ArticleSchema.safeParse({
    rank: 1,
    id: 123,
    title: "Article",
    url: "https://example.com",
    score: 100,
    comments: 50,
  });
  assertEquals(result.success, true);
});

Deno.test("ArticleSchema: rank must be positive integer", () => {
  const result = ArticleSchema.safeParse({
    rank: 0,
    id: 1,
    title: "t",
    url: "https://a.com",
    score: 1,
    comments: 0,
  });
  assertEquals(result.success, false);
});

Deno.test("ArticleSchema: score cannot be negative", () => {
  const result = ArticleSchema.safeParse({
    rank: 1,
    id: 1,
    title: "t",
    url: "https://a.com",
    score: -1,
    comments: 0,
  });
  assertEquals(result.success, false);
});

Deno.test("ArticleSchema: empty title → invalid", () => {
  const result = ArticleSchema.safeParse({
    rank: 1,
    id: 1,
    title: "",
    url: "https://a.com",
    score: 10,
    comments: 0,
  });
  assertEquals(result.success, false);
});
