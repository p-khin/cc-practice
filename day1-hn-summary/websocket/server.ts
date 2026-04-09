import { Hono } from "@hono/hono";
import { upgradeWebSocket } from "@hono/hono/deno";
import type { WSContext } from "@hono/hono/ws";

// ── Types ─────────────────────────────────────────────────────────────────

interface Article {
  id: number;
  title: string;
  url: string;
  score: number;
  comments: number;
  timestamp: number;
}

type Message =
  | { type: "snapshot"; articles: Article[] }
  | { type: "new_article"; article: Article };

// ── State ─────────────────────────────────────────────────────────────────

const clients = new Set<WSContext<WebSocket>>();
const articleCache = new Map<number, Article>();
let knownIds = new Set<number>();

const HN_API = "https://hacker-news.firebaseio.com/v0";
const POLL_INTERVAL_MS = 60_000;
const REQUEST_DELAY_MS = 1_000;

// ── Helpers ───────────────────────────────────────────────────────────────

function broadcast(msg: Message): void {
  const json = JSON.stringify(msg);
  for (const client of clients) {
    try {
      client.send(json);
    } catch {
      clients.delete(client);
    }
  }
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchItem(id: number): Promise<Article | null> {
  try {
    const resp = await fetch(`${HN_API}/item/${id}.json`);
    if (!resp.ok) return null;
    // deno-lint-ignore no-explicit-any
    const data: any = await resp.json();
    if (!data?.title) return null;
    return {
      id: data.id,
      title: data.title,
      url: data.url ?? `https://news.ycombinator.com/item?id=${data.id}`,
      score: data.score ?? 0,
      comments: data.descendants ?? 0,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

async function fetchTopIds(): Promise<number[]> {
  const resp = await fetch(`${HN_API}/topstories.json`);
  if (!resp.ok) throw new Error(`HN API returned ${resp.status}`);
  const ids: number[] = await resp.json();
  return ids.slice(0, 10);
}

// ── Polling ───────────────────────────────────────────────────────────────

/** Initial load: populate cache without broadcasting. */
async function init(): Promise<void> {
  console.log("[init] Loading top 10 articles…");
  const ids = await fetchTopIds();

  for (let i = 0; i < ids.length; i++) {
    if (i > 0) await delay(REQUEST_DELAY_MS);
    const article = await fetchItem(ids[i]);
    if (article) articleCache.set(ids[i], article);
  }

  knownIds = new Set(ids);
  console.log(`[init] Loaded ${articleCache.size} articles. Polling every ${POLL_INTERVAL_MS / 1000}s.`);
}

/** Subsequent polls: detect new entries and broadcast them. */
async function poll(): Promise<void> {
  try {
    const ids = await fetchTopIds();
    const newIds = ids.filter((id) => !knownIds.has(id));

    for (const id of newIds) {
      await delay(REQUEST_DELAY_MS);
      const article = await fetchItem(id);
      if (article) {
        articleCache.set(id, article);
        broadcast({ type: "new_article", article });
        console.log(`[poll] New article: "${article.title}" (score: ${article.score})`);
      }
    }

    // Evict articles that dropped out of top 10
    for (const id of knownIds) {
      if (!ids.includes(id)) articleCache.delete(id);
    }

    knownIds = new Set(ids);
    if (newIds.length === 0) {
      console.log("[poll] No new articles.");
    }
  } catch (err) {
    console.error("[poll] Error:", err);
  }
}

// ── Hono app ──────────────────────────────────────────────────────────────

const app = new Hono();

app.get("/", async (c) => {
  const html = await Deno.readTextFile(
    new URL("./client.html", import.meta.url),
  );
  return c.html(html);
});

app.get("/ws", upgradeWebSocket((_c) => ({
  onOpen(_e, ws) {
    clients.add(ws as WSContext<WebSocket>);
    console.log(`[ws] Client connected  (total: ${clients.size})`);

    // Send current snapshot sorted by score
    const articles = [...articleCache.values()].sort((a, b) => b.score - a.score);
    ws.send(JSON.stringify({ type: "snapshot", articles } satisfies Message));
  },

  onClose(_e, ws) {
    clients.delete(ws as WSContext<WebSocket>);
    console.log(`[ws] Client disconnected (total: ${clients.size})`);
  },

  onError(_e, ws) {
    clients.delete(ws as WSContext<WebSocket>);
  },
})));

// ── Start ─────────────────────────────────────────────────────────────────

// Server starts accepting connections immediately; init runs concurrently.
Deno.serve({ port: 8000 }, app.fetch);
console.log("Server listening on http://localhost:8000");

await init();
setInterval(poll, POLL_INTERVAL_MS);
