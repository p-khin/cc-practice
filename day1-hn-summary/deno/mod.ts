import { parseArgs } from "jsr:@std/cli/parse-args";
import { OptionsError, type Format, type SummaryOptions } from "./types.ts";
import { fetchTop10, filterByComments } from "./hn-top10.ts";
import { generateSummary } from "./hn-summary.ts";

const VALID_FORMATS: Format[] = ["markdown", "html", "json"];

export function parseOptions(args: string[]): SummaryOptions {
  const parsed = parseArgs(args, {
    boolean: ["categorize"],
    string: ["format", "min-comments"],
    default: {
      categorize: false,
      format: "markdown",
      "min-comments": "0",
    },
    unknown: (opt) => {
      throw new OptionsError(`Unknown option: ${opt}`);
    },
  });

  const format = parsed["format"] as string;
  if (!VALID_FORMATS.includes(format as Format)) {
    throw new OptionsError(
      `Unknown format: ${format} (choose markdown, html, or json)`,
    );
  }

  const minComments = parseInt(parsed["min-comments"] as string, 10);
  if (isNaN(minComments) || minComments < 0) {
    throw new OptionsError(`--min-comments must be a non-negative integer`);
  }

  return {
    categorize: parsed["categorize"] as boolean,
    minComments,
    format: format as Format,
  };
}

if (import.meta.main) {
  let opts: SummaryOptions;
  try {
    opts = parseOptions(Deno.args);
  } catch (e) {
    if (e instanceof OptionsError) {
      console.error(e.message);
      Deno.exit(1);
    }
    throw e;
  }

  let articles = await fetchTop10();

  if (opts.minComments > 0) {
    articles = filterByComments(articles, opts.minComments);
    if (articles.length === 0) {
      console.error(
        `コメント数が ${opts.minComments} 以上の記事はありません。`,
      );
      Deno.exit(0);
    }
  }

  await generateSummary(articles, opts);
}
