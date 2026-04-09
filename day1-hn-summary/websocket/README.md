# HN Live Feed — WebSocket Server

Real-time Hacker News feed using [Hono](https://hono.dev/) and WebSocket, powered by Deno.

## Requirements

- [Deno](https://deno.com/) v1.40+

## Start the server

```bash
cd websocket/
deno task start
```

Or manually:

```bash
deno run --allow-net --allow-read=./client.html server.ts
```

Then open **http://localhost:8000** in your browser.

## How it works

```
Browser ──WebSocket──▶ server.ts ──fetch──▶ HN Firebase API
                           │
                     polls every 60s
                     broadcasts new articles to all clients
```

1. On startup the server fetches the current HN top 10 and caches them.
2. Each WebSocket client receives a **snapshot** of those articles on connect.
3. Every 60 seconds the server re-checks the top 10; any new article IDs are fetched and pushed to all connected clients as a **`new_article`** message.
4. The browser client auto-reconnects with exponential back-off if the connection drops.

## WebSocket message format

| Message | Direction | Shape |
|---------|-----------|-------|
| `snapshot` | server → client | `{ type: "snapshot", articles: Article[] }` |
| `new_article` | server → client | `{ type: "new_article", article: Article }` |

```ts
interface Article {
  id: number;
  title: string;
  url: string;
  score: number;
  comments: number;
  timestamp: number; // ms since epoch
}
```

## Permissions used

| Flag | Reason |
|------|--------|
| `--allow-net` | Fetch HN API + serve HTTP/WebSocket |
| `--allow-read=./client.html` | Serve the HTML client |
