import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const MAX_SENTENCE_LENGTH = 40;
const PAGES_WITHOUT_LENGTH_LIMIT = [];

const JAPANESE = /[぀-ヿ一-鿿]/;
const HIDDEN_BLOCKS = /<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1>/g;
const DISPLAYED_ATTRIBUTES = /\b(?:aria-label|alt|placeholder|title)="([^"]*)"/g;
const INLINE_TAGS = /<\/?(?:a|b|code|em|span|strong)\b[^>]*>/g;
const STRING_LITERALS = /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g;

function rootFiles(extension) {
  return readdirSync(ROOT).filter((name) => name.endsWith(extension));
}

function read(name) {
  return readFileSync(new URL(name, ROOT), "utf8");
}

function sentences(text) {
  return text
    .split(/\n|(?<=[。！？])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => JAPANESE.test(sentence));
}

function pageSentences(html) {
  const visible = html.replace(HIDDEN_BLOCKS, "");
  const attributes = [...visible.matchAll(DISPLAYED_ATTRIBUTES)].map((match) => match[1]);
  const body = visible
    .replace(INLINE_TAGS, "")
    .replace(/\s+/g, " ")
    .replace(/<[^>]*>/g, "\n");
  return [...attributes, body].flatMap(sentences);
}

function scriptSentences(source) {
  return [...source.matchAll(STRING_LITERALS)]
    .map((match) => match[1] ?? match[2] ?? match[3])
    .flatMap(sentences);
}

function lengthWithoutSpaces(sentence) {
  return [...sentence.replace(/\s/g, "")].length;
}

test(`画面の文章は 1 文が ${MAX_SENTENCE_LENGTH} 字以内である`, () => {
  const pages = rootFiles(".html")
    .filter((name) => !PAGES_WITHOUT_LENGTH_LIMIT.includes(name))
    .flatMap((name) => pageSentences(read(name)).map((sentence) => ({ file: name, sentence })));
  const scripts = rootFiles(".mjs").flatMap((name) =>
    scriptSentences(read(name)).map((sentence) => ({ file: name, sentence })),
  );

  const tooLong = [...pages, ...scripts]
    .map((entry) => ({ ...entry, length: lengthWithoutSpaces(entry.sentence) }))
    .filter((entry) => entry.length > MAX_SENTENCE_LENGTH);

  assert.deepEqual(tooLong, []);
});
