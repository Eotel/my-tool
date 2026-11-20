import { test } from "node:test";
import assert from "node:assert/strict";
import { extractAudioJob } from "../commands.mjs";

test("音声の抽出は映像を除外して mp3 を出力する", () => {
  const job = extractAudioJob("旅行.mov");

  assert.ok(job.args.includes("-vn"));
  assert.equal(job.args.at(-1), job.outputPath);
  assert.ok(job.outputPath.endsWith(".mp3"));
  assert.equal(job.mimeType, "audio/mpeg");
});

test("保存するファイルの名前は元の名前の拡張子を mp3 に変更する", () => {
  assert.equal(extractAudioJob("旅行.mov").downloadName, "旅行.mp3");
  assert.equal(extractAudioJob("2026.11.20 会議.mp4").downloadName, "2026.11.20 会議.mp3");
  assert.equal(extractAudioJob("録画").downloadName, "録画.mp3");
});

test("元のファイルの名前を ffmpeg の引数に渡さない", () => {
  const job = extractAudioJob("-y.mp4");

  assert.ok(!job.args.includes("-y.mp4"));
  assert.equal(job.args[job.args.indexOf("-i") + 1], job.inputPath);
});
