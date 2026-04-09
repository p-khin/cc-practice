import { assertEquals } from "jsr:@std/assert";
import { buildArticle, filterByComments } from "../hn-top10.ts";
import type { HNItem } from "../types.ts";

// ── buildArticle ──────────────────────────────────────────────────────────

const BASE_ITEM: HNItem = {
  id: 1001,
  title: "Test Article",
  url: "https://example.com/article",
  score: 250,
  descendants: 42,
  type: "story",
};

Deno.test("buildArticle: maps all fields correctly", () => {
  const article = buildArticle(BASE_ITEM, 1);
  assertEquals(article.rank, 1);
  assertEquals(article.id, 1001);
  assertEquals(article.title, "Test Article");
  assertEquals(article.url, "https://example.com/article");
  assertEquals(article.score, 250);
  assertEquals(article.comments, 42);
});

Deno.test("buildArticle: rank is set from parameter", () => {
  const a3 = buildArticle(BASE_ITEM, 3);
  const a7 = buildArticle(BASE_ITEM, 7);
  assertEquals(a3.rank, 3);
  assertEquals(a7.rank, 7);
});

Deno.test("buildArticle: missing url falls back to HN permalink", () => {
  const item: HNItem = { id: 9999, title: "No URL", score: 10 };
  const article = buildArticle(item, 1);
  assertEquals(article.url, "https://news.ycombinator.com/item?id=9999");
});

Deno.test("buildArticle: missing descendants defaults to 0 comments", () => {
  const item: HNItem = {
    id: 1,
    title: "No Descendants",
    url: "https://example.com",
    score: 5,
  };
  const article = buildArticle(item, 1);
  assertEquals(article.comments, 0);
});

// ── filterByComments ──────────────────────────────────────────────────────

const MOCK_ARTICLES = [0, 10, 25, 50, 100].map((comments, i) =>
  buildArticle(
    {
      id: 1000 + i,
      title: `Article ${i}`,
      url: `https://example.com/${i}`,
      score: 100,
      descendants: comments,
    },
    i + 1,
  )
);

Deno.test("filterByComments: min=0 keeps all articles", () => {
  const result = filterByComments(MOCK_ARTICLES, 0);
  assertEquals(result.length, 5);
});

Deno.test("filterByComments: min=50 keeps articles with ≥50 comments", () => {
  const result = filterByComments(MOCK_ARTICLES, 50);
  assertEquals(result.length, 2);
  assertEquals(result.every((a) => a.comments >= 50), true);
});

Deno.test("filterByComments: min=101 returns empty array", () => {
  const result = filterByComments(MOCK_ARTICLES, 101);
  assertEquals(result.length, 0);
});

Deno.test("filterByComments: exact boundary is inclusive", () => {
  const result = filterByComments(MOCK_ARTICLES, 100);
  assertEquals(result.length, 1);
  assertEquals(result[0].comments, 100);
});
