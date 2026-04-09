import { HNItemSchema, type Article, type HNItem } from "./types.ts";

const API_BASE = "https://hacker-news.firebaseio.com/v0";
const DELAY_MS = 1000;

/** Transform a validated HN item into the normalized Article shape. */
export function buildArticle(item: HNItem, rank: number): Article {
  return {
    rank,
    id: item.id,
    title: item.title,
    url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
    score: item.score,
    comments: item.descendants ?? 0,
  };
}

/** Filter articles by minimum comment count. */
export function filterByComments(articles: Article[], min: number): Article[] {
  return articles.filter((a) => a.comments >= min);
}

/** Fetch and validate a single HN item. Returns null on invalid data. */
async function fetchItem(
  id: number,
  fetcher: typeof fetch,
): Promise<HNItem | null> {
  const resp = await fetcher(`${API_BASE}/item/${id}.json`);
  const raw = await resp.json();
  const parsed = HNItemSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(`[hn-top10] Invalid item ${id}:`, parsed.error.issues);
    return null;
  }
  return parsed.data;
}

/** Fetch the top 10 HN stories. Pass a custom fetcher for testing. */
export async function fetchTop10(
  fetcher: typeof fetch = fetch,
): Promise<Article[]> {
  const resp = await fetcher(`${API_BASE}/topstories.json`);
  if (!resp.ok) throw new Error(`HN API error: ${resp.status}`);

  const ids: number[] = await resp.json();
  const top10 = ids.slice(0, 10);

  const articles: Article[] = [];

  for (let i = 0; i < top10.length; i++) {
    const item = await fetchItem(top10[i], fetcher);
    if (item) articles.push(buildArticle(item, i + 1));

    // Rate-limit: 1s between requests (skip delay after last item)
    if (i < top10.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return articles;
}

// CLI entry point
if (import.meta.main) {
  const articles = await fetchTop10();
  console.log(JSON.stringify(articles, null, 2));
}
