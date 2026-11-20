import { extractAudioJob } from "./commands.mjs";

const { FFmpeg } = globalThis.FFmpegWASM;

const fileInput = document.querySelector("#file");
const runButton = document.querySelector("#run");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const player = document.querySelector("#player");
const saveLink = document.querySelector("#save");

let loadedFFmpeg = null;
let resultUrl = null;

async function loadFFmpeg() {
  if (loadedFFmpeg) return loadedFFmpeg;
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: new URL("vendor/core/ffmpeg-core.js", document.baseURI).href,
    wasmURL: new URL("vendor/core/ffmpeg-core.wasm", document.baseURI).href,
  });
  loadedFFmpeg = ffmpeg;
  return ffmpeg;
}

async function runJob(ffmpeg, job, file) {
  await ffmpeg.writeFile(job.inputPath, new Uint8Array(await file.arrayBuffer()));
  try {
    const exitCode = await ffmpeg.exec(job.args);
    if (exitCode !== 0) throw new Error(`ffmpeg exited with ${exitCode}`);
    const data = await ffmpeg.readFile(job.outputPath);
    return new Blob([data], { type: job.mimeType });
  } finally {
    await ffmpeg.deleteFile(job.inputPath).catch(() => {});
    await ffmpeg.deleteFile(job.outputPath).catch(() => {});
  }
}

function showStatus(text, isError = false) {
  status.textContent = text;
  status.classList.toggle("is-error", isError);
}

function showResult(blob, downloadName) {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = URL.createObjectURL(blob);
  player.src = resultUrl;
  saveLink.href = resultUrl;
  saveLink.download = downloadName;
  result.hidden = false;
  runButton.classList.add("is-secondary");
}

function hideResult() {
  result.hidden = true;
  runButton.classList.remove("is-secondary");
}

fileInput.addEventListener("change", () => {
  runButton.disabled = fileInput.files.length === 0;
  hideResult();
  showStatus("");
});

runButton.addEventListener("click", async () => {
  const [file] = fileInput.files;
  const job = extractAudioJob(file.name);
  runButton.disabled = true;
  fileInput.disabled = true;
  hideResult();
  let focusTarget = runButton;
  try {
    showStatus("準備中");
    const ffmpeg = await loadFFmpeg();
    showStatus("処理中");
    showResult(await runJob(ffmpeg, job, file), job.downloadName);
    showStatus("取り出しました");
    focusTarget = saveLink;
  } catch (error) {
    console.error(error);
    showStatus("このファイルから音声を取り出せませんでした", true);
  } finally {
    runButton.disabled = false;
    fileInput.disabled = false;
    focusTarget.focus();
  }
});
