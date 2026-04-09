import type { Article, SummaryOptions } from "./types.ts";

const PROMPTS = {
  markdownFlat:
    "以下はHacker Newsのトップ10記事リスト（JSON形式）です。\n今日の技術トレンドを日本語で3行にまとめ、\nその後、各記事の1行サマリーを箇条書きで出力してください。\n出力はMarkdown形式でお願いします。",
  markdownCategorize:
    "以下はHacker Newsのトップ10記事リスト（JSON形式）です。\n今日の技術トレンドを日本語で3行にまとめ、\nその後、記事をカテゴリ（例：AI・ML、セキュリティ、Web開発、ビジネス、その他）ごとにグループ化して、\n各記事の1行サマリーを箇条書きで出力してください。\n出力はMarkdown形式でお願いします。",
  htmlFlat:
    "以下はHacker Newsのトップ10記事リスト（JSON形式）です。\n今日の技術トレンドを日本語で3行にまとめ、\nその後、各記事の1行サマリーをリスト形式で出力してください。\n出力はHTML形式（<h2>/<ul>/<li>/<p>/<a>タグを使用）でお願いします。コードブロックは使わず、HTMLのみ出力してください。",
  htmlCategorize:
    "以下はHacker Newsのトップ10記事リスト（JSON形式）です。\n今日の技術トレンドを日本語で3行にまとめ、\nその後、記事をカテゴリ（例：AI・ML、セキュリティ、Web開発、ビジネス、その他）ごとにグループ化して、\n各記事の1行サマリーをリスト形式で出力してください。\n出力はHTML形式（<h2>/<h3>/<ul>/<li>/<p>/<a>タグを使用）でお願いします。コードブロックは使わず、HTMLのみ出力してください。",
};

function formatDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}年${m}月${d}日`;
}

function selectPrompt(opts: SummaryOptions): string {
  if (opts.format === "html") {
    return opts.categorize ? PROMPTS.htmlCategorize : PROMPTS.htmlFlat;
  }
  return opts.categorize ? PROMPTS.markdownCategorize : PROMPTS.markdownFlat;
}

async function runClaude(prompt: string, input: string): Promise<void> {
  const cmd = new Deno.Command("claude", {
    args: ["-p", prompt],
    stdin: "piped",
    stdout: "inherit",
    stderr: "inherit",
  });

  const process = cmd.spawn();
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(input));
  await writer.close();

  const status = await process.status;
  if (!status.success) {
    throw new Error(`claude exited with code ${status.code}`);
  }
}

export async function generateSummary(
  articles: Article[],
  opts: SummaryOptions,
): Promise<void> {
  const json = JSON.stringify(articles, null, 2);

  if (opts.format === "json") {
    console.log(json);
    return;
  }

  const date = formatDate();
  console.log(`# Hacker News トップ10 サマリー — ${date}`);
  console.log();

  await runClaude(selectPrompt(opts), json);
}

export { formatDate, selectPrompt };
