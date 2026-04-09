import { assertEquals, assertThrows } from "jsr:@std/assert";
import { parseOptions } from "../mod.ts";
import { OptionsError } from "../types.ts";

// ── defaults ──────────────────────────────────────────────────────────────

Deno.test("parseOptions: no args → defaults", () => {
  const opts = parseOptions([]);
  assertEquals(opts.categorize, false);
  assertEquals(opts.minComments, 0);
  assertEquals(opts.format, "markdown");
});

// ── --categorize ──────────────────────────────────────────────────────────

Deno.test("parseOptions: --categorize sets flag", () => {
  const opts = parseOptions(["--categorize"]);
  assertEquals(opts.categorize, true);
});

// ── --format ─────────────────────────────────────────────────────────────

Deno.test("parseOptions: --format markdown", () => {
  const opts = parseOptions(["--format", "markdown"]);
  assertEquals(opts.format, "markdown");
});

Deno.test("parseOptions: --format html", () => {
  const opts = parseOptions(["--format", "html"]);
  assertEquals(opts.format, "html");
});

Deno.test("parseOptions: --format json", () => {
  const opts = parseOptions(["--format", "json"]);
  assertEquals(opts.format, "json");
});

Deno.test("parseOptions: unknown format throws OptionsError", () => {
  assertThrows(
    () => parseOptions(["--format", "xml"]),
    OptionsError,
    "Unknown format: xml",
  );
});

// ── --min-comments ────────────────────────────────────────────────────────

Deno.test("parseOptions: --min-comments 50", () => {
  const opts = parseOptions(["--min-comments", "50"]);
  assertEquals(opts.minComments, 50);
});

Deno.test("parseOptions: --min-comments 0 is valid", () => {
  const opts = parseOptions(["--min-comments", "0"]);
  assertEquals(opts.minComments, 0);
});

Deno.test("parseOptions: --min-comments negative throws OptionsError", () => {
  assertThrows(
    () => parseOptions(["--min-comments", "-1"]),
    OptionsError,
  );
});

Deno.test("parseOptions: --min-comments non-number throws OptionsError", () => {
  assertThrows(
    () => parseOptions(["--min-comments", "abc"]),
    OptionsError,
  );
});

// ── combined ──────────────────────────────────────────────────────────────

Deno.test("parseOptions: all flags combined", () => {
  const opts = parseOptions([
    "--categorize",
    "--format",
    "html",
    "--min-comments",
    "100",
  ]);
  assertEquals(opts.categorize, true);
  assertEquals(opts.format, "html");
  assertEquals(opts.minComments, 100);
});

// ── unknown option ────────────────────────────────────────────────────────

Deno.test("parseOptions: unknown option throws OptionsError", () => {
  assertThrows(
    () => parseOptions(["--unknown-flag"]),
    OptionsError,
  );
});
