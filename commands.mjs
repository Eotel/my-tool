const INPUT_PATH = "input";

function replaceExtension(fileName, extension) {
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  return `${stem}.${extension}`;
}

export function extractAudioJob(sourceName) {
  const outputPath = "output.mp3";
  return {
    inputPath: INPUT_PATH,
    outputPath,
    args: ["-i", INPUT_PATH, "-vn", "-c:a", "libmp3lame", "-q:a", "2", outputPath],
    downloadName: replaceExtension(sourceName, "mp3"),
    mimeType: "audio/mpeg",
  };
}
