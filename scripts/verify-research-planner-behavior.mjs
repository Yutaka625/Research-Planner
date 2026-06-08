import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const promptSource = await readFile("src/lib/prompt.ts", "utf8");

assert.match(
  promptSource,
  /Markdownの表/,
  "summary prompt should require Markdown tables",
);
assert.match(
  promptSource,
  /こんなことが言えそう[\s\S]*観点[\s\S]*根拠[\s\S]*言えそうなこと/,
  "summary prompt should make 'こんなことが言えそう' detailed and structured",
);
assert.match(
  promptSource,
  /箇条書き/,
  "summary prompt should require lists where they improve readability",
);

const suggestionPromptSource = await readFile(
  "src/lib/suggestionPrompt.ts",
  "utf8",
);
const suggestionRouteSource = await readFile(
  "src/app/api/suggest-options/route.ts",
  "utf8",
);

assert.match(
  suggestionPromptSource,
  /回答済みの内容/,
  "suggestion prompt should use previously answered context",
);
assert.match(
  suggestionPromptSource,
  /ネット調査/,
  "suggestion prompt should ask for web-informed choices",
);
assert.match(
  suggestionRouteSource,
  /google_search/,
  "suggestion endpoint should enable Gemini Google Search grounding",
);
assert.match(
  suggestionRouteSource,
  /suggestionGroups/,
  "suggestion endpoint should return grouped options",
);
