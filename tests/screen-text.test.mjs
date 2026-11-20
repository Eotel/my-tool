import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TEXTS } from "../texts.mjs";

const MAX_SENTENCE_LENGTH = 40;
const JARGON = ["コーデック", "ビットレート", "エンコード", "デコード", "fps", "フレームレート", "コンテナ", "ストリーム"];

function htmlTexts(path) {
  const body = readFileSync(new URL(path, import.meta.url), "utf8").replace(/^[\s\S]*<body>/, "");
  return body
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<\/?a\b[^>]*>/g, "")
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function stringsIn(value) {
  if (typeof value === "string") return [value];
  return Object.values(value).flatMap(stringsIn);
}

function sentencesOf(texts) {
  return texts.flatMap((text) => text.split("。")).filter(Boolean);
}

const appSentences = sentencesOf([...htmlTexts("../index.html"), ...stringsIn(TEXTS)]);
const sentences = [...appSentences, ...sentencesOf(htmlTexts("../licenses.html"))];

test("画面の文章は 1 文が 40 字以内である（AGENTS.md）", () => {
  const tooLong = sentences.filter((sentence) => sentence.length > MAX_SENTENCE_LENGTH);
  assert.deepEqual(tooLong, []);
});

test("画面の文章は専門用語を使用しない（AGENTS.md）", () => {
  const found = appSentences.filter((sentence) => JARGON.some((word) => sentence.includes(word)));
  assert.deepEqual(found, []);
});
