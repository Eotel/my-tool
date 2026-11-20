import { INPUT, PROBE_ARGS, convertJob, operationsFor, parseStreams } from "./commands.mjs";
import { TEXTS } from "./texts.mjs";

const { FFmpeg } = globalThis.FFmpegWASM;

const form = document.querySelector("#form");
const fileInput = document.querySelector("#file");
const operationField = document.querySelector("#operations");
const operationChoices = document.querySelector("#operation-choices");
const formatField = document.querySelector("#formats");
const formatChoices = document.querySelector("#format-choices");
const runButton = document.querySelector("#run");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const preview = document.querySelector("#preview");
const saveLink = document.querySelector("#save");

let loadedFFmpeg = null;
let logLines = [];
let operations = [];
let resultUrl = null;

async function loadFFmpeg() {
  if (loadedFFmpeg) return loadedFFmpeg;
  const ffmpeg = new FFmpeg();
  ffmpeg.on("log", ({ message }) => logLines.push(message));
  await ffmpeg.load({
    coreURL: new URL("vendor/core/ffmpeg-core.js", document.baseURI).href,
    wasmURL: new URL("vendor/core/ffmpeg-core.wasm", document.baseURI).href,
  });
  loadedFFmpeg = ffmpeg;
  return ffmpeg;
}

async function probe(ffmpeg, file) {
  await ffmpeg.deleteFile(INPUT).catch(() => {});
  await ffmpeg.writeFile(INPUT, new Uint8Array(await file.arrayBuffer()));
  logLines = [];
  await ffmpeg.exec(PROBE_ARGS);
  return operationsFor(parseStreams(logLines));
}

async function runJob(ffmpeg, job) {
  try {
    const exitCode = await ffmpeg.exec(job.args);
    if (exitCode !== 0) throw new Error(`ffmpeg exited with ${exitCode}`);
    const data = await ffmpeg.readFile(job.outputPath);
    return new Blob([data], { type: job.mimeType });
  } finally {
    await ffmpeg.deleteFile(job.outputPath).catch(() => {});
  }
}

function showStatus(text, isError = false) {
  status.textContent = text;
  status.classList.toggle("is-error", isError);
}

function setBusy(isBusy) {
  fileInput.disabled = isBusy;
  runButton.disabled = isBusy;
  operationField.disabled = isBusy;
  formatField.disabled = isBusy;
}

function choice(name, value, title, note) {
  const label = document.createElement("label");
  label.className = "choice";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  const text = document.createElement("span");
  text.className = "choice-text";
  const heading = document.createElement("span");
  heading.className = "choice-title";
  heading.textContent = title;
  text.append(heading);
  if (note) {
    const detail = document.createElement("span");
    detail.className = "choice-note";
    detail.textContent = note;
    text.append(detail);
  }
  label.append(input, text);
  return label;
}

function selected(name) {
  return form.elements[name]?.value ?? "";
}

function selectedOperation() {
  return operations.find((operation) => operation.id === selected("operation"));
}

function selectedFormat() {
  const operation = selectedOperation();
  return operation.formats.length === 1 ? operation.formats[0] : selected("format");
}

function previewElement(blob, url) {
  const kind = blob.type.split("/")[0];
  const element = document.createElement(kind === "image" ? "img" : kind);
  element.src = url;
  if (kind === "image") element.alt = TEXTS.preview;
  else {
    element.controls = true;
    element.setAttribute("aria-label", TEXTS.preview);
  }
  if (kind === "video") element.playsInline = true;
  return element;
}

function hideResult() {
  result.hidden = true;
  preview.replaceChildren();
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = null;
  runButton.classList.remove("is-secondary");
}

function showResult(blob, job, format) {
  resultUrl = URL.createObjectURL(blob);
  preview.replaceChildren(previewElement(blob, resultUrl));
  saveLink.href = resultUrl;
  saveLink.download = job.downloadName;
  saveLink.textContent = TEXTS.save(format);
  result.hidden = false;
  runButton.classList.add("is-secondary");
}

function renderFormats() {
  const { id, formats } = selectedOperation();
  formatChoices.replaceChildren(...formats.map((format) => choice("format", format, format, TEXTS.formats[format])));
  formatField.hidden = formats.length === 1;
  if (!formatField.hidden) form.elements.format[0].checked = true;
  renderRunLabel(id);
}

function renderRunLabel(operationId = selected("operation")) {
  runButton.textContent = TEXTS.operations[operationId].run(selectedFormat());
}

function renderOperations() {
  operationChoices.replaceChildren(
    ...operations.map(({ id }) => choice("operation", id, TEXTS.operations[id].label)),
  );
  operationChoices.querySelector("input").checked = true;
  operationField.hidden = false;
  runButton.hidden = false;
  renderFormats();
}

function hideChoices() {
  operations = [];
  operationChoices.replaceChildren();
  formatChoices.replaceChildren();
  operationField.hidden = true;
  formatField.hidden = true;
  runButton.hidden = true;
}

fileInput.addEventListener("change", async () => {
  hideResult();
  hideChoices();
  showStatus("");
  const [file] = fileInput.files;
  if (!file) return;
  setBusy(true);
  let focusTarget = fileInput;
  try {
    showStatus(TEXTS.status.preparing);
    const ffmpeg = await loadFFmpeg();
    showStatus(TEXTS.status.checking);
    operations = await probe(ffmpeg, file);
    if (operations.length === 0) {
      showStatus(TEXTS.errors.unreadable, true);
      return;
    }
    showStatus("");
    renderOperations();
    focusTarget = operationChoices.querySelector("input:checked");
  } catch (error) {
    console.error(error);
    showStatus(TEXTS.errors.unreadable, true);
  } finally {
    setBusy(false);
    focusTarget.focus();
  }
});

form.addEventListener("change", (event) => {
  if (event.target.name === "operation") renderFormats();
  if (event.target.name === "format") renderRunLabel();
  if (event.target.name) {
    hideResult();
    showStatus("");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const format = selectedFormat();
  const job = convertJob(fileInput.files[0].name, format);
  hideResult();
  setBusy(true);
  let focusTarget = runButton;
  try {
    showStatus(TEXTS.status.working);
    showResult(await runJob(loadedFFmpeg, job), job, format);
    showStatus(TEXTS.status.done);
    focusTarget = saveLink;
  } catch (error) {
    console.error(error);
    showStatus(TEXTS.errors.failed, true);
  } finally {
    setBusy(false);
    focusTarget.focus();
  }
});
