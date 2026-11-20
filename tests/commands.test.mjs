import { test } from "node:test";
import assert from "node:assert/strict";
import { convertJob, operationsFor, parseStreams } from "../commands.mjs";

const VIDEO_WITH_AUDIO = [
  "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'input':",
  "  Stream #0:0(und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 320x240, 15 fps",
  "  Stream #0:1(und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp",
];
const VIDEO_ONLY = ["  Stream #0:0(und): Video: h264 (High), yuv420p, 320x240, 15 fps"];
const AUDIO_ONLY = ["  Stream #0:0: Audio: pcm_s16le ([1][0][0][0] / 0x0001), 44100 Hz, 1 channels, s16"];
const AUDIO_WITH_COVER = [
  "  Stream #0:0: Audio: mp3, 44100 Hz, stereo, fltp, 128 kb/s",
  "  Stream #0:1: Video: mjpeg (Baseline), yuvj420p, 600x600, 90k tbr, 90k tbn (attached pic)",
];
const NOT_MEDIA = ["input: Invalid data found when processing input"];

function operations(logLines) {
  return operationsFor(parseStreams(logLines));
}

test("映像と音声のある動画は 4 形式への変換と音声の抽出を選択できる", () => {
  assert.deepEqual(operations(VIDEO_WITH_AUDIO), [
    { id: "convert", formats: ["mp4", "webm", "gif", "mp3"] },
    { id: "extract-audio", formats: ["mp3"] },
  ]);
});

test("音声のない動画は mp3 と音声の抽出を選択できない", () => {
  assert.deepEqual(operations(VIDEO_ONLY), [{ id: "convert", formats: ["mp4", "webm", "gif"] }]);
});

test("音声のファイルは mp3 への変換だけを選択できる", () => {
  assert.deepEqual(operations(AUDIO_ONLY), [{ id: "convert", formats: ["mp3"] }]);
  assert.deepEqual(operations(AUDIO_WITH_COVER), [{ id: "convert", formats: ["mp3"] }]);
});

test("動画でも音声でもないファイルは操作を選択できない", () => {
  assert.deepEqual(operations(NOT_MEDIA), []);
});

test("変換の結果は選択した形式の拡張子と種類になる", () => {
  const expected = { mp4: "video/mp4", webm: "video/webm", gif: "image/gif", mp3: "audio/mpeg" };
  for (const [format, mimeType] of Object.entries(expected)) {
    const job = convertJob("旅行.mov", format);
    assert.equal(job.downloadName, `旅行.${format}`);
    assert.equal(job.mimeType, mimeType);
    assert.equal(job.args.at(-1), job.outputPath);
    assert.ok(job.outputPath.endsWith(`.${format}`));
  }
});

test("保存するファイルの名前は最後の拡張子だけを変更する", () => {
  assert.equal(convertJob("2026.11.20 会議.mp4", "mp3").downloadName, "2026.11.20 会議.mp3");
  assert.equal(convertJob("録画", "webm").downloadName, "録画.webm");
});

test("gif と mp3 は不要な映像または音声を出力しない", () => {
  assert.ok(convertJob("a.mp4", "gif").args.includes("-an"));
  assert.ok(convertJob("a.mp4", "mp3").args.includes("-vn"));
});

test("元のファイルの名前を ffmpeg の引数に渡さない", () => {
  const job = convertJob("-y.mp4", "mp4");

  assert.ok(!job.args.includes("-y.mp4"));
  assert.equal(job.args[job.args.indexOf("-i") + 1], job.inputPath);
});
