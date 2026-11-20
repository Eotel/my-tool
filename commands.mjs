const INPUT_PATH = "input";

const EVEN_SIZE = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
const GIF_FILTER =
  "fps=10,scale='min(480,iw)':-2:flags=lanczos,split[frames][source];[source]palettegen[palette];[frames][palette]paletteuse";

const FORMATS = {
  mp4: {
    mimeType: "video/mp4",
    needs: "video",
    args: [
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-vf", EVEN_SIZE,
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
    ],
  },
  webm: {
    mimeType: "video/webm",
    needs: "video",
    args: ["-c:v", "libvpx", "-deadline", "realtime", "-cpu-used", "4", "-crf", "10", "-b:v", "2M", "-c:a", "libvorbis"],
  },
  gif: {
    mimeType: "image/gif",
    needs: "video",
    args: ["-an", "-filter_complex", GIF_FILTER, "-loop", "0"],
  },
  mp3: {
    mimeType: "audio/mpeg",
    needs: "audio",
    args: ["-vn", "-c:a", "libmp3lame", "-q:a", "2"],
  },
};

function replaceExtension(fileName, extension) {
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  return `${stem}.${extension}`;
}

export const PROBE_ARGS = ["-hide_banner", "-i", INPUT_PATH];
export const INPUT = INPUT_PATH;

export function convertJob(sourceName, format) {
  const { mimeType, args } = FORMATS[format];
  const outputPath = `output.${format}`;
  return {
    inputPath: INPUT_PATH,
    outputPath,
    args: ["-i", INPUT_PATH, ...args, outputPath],
    downloadName: replaceExtension(sourceName, format),
    mimeType,
  };
}

export function parseStreams(logLines) {
  const streams = logLines.filter((line) => /^\s*Stream #\d+:\d+/.test(line));
  return {
    hasVideo: streams.some((line) => line.includes(": Video:") && !line.includes("(attached pic)")),
    hasAudio: streams.some((line) => line.includes(": Audio:")),
  };
}

export function operationsFor({ hasVideo, hasAudio }) {
  const available = { video: hasVideo, audio: hasAudio };
  const formats = Object.keys(FORMATS).filter((format) => available[FORMATS[format].needs]);
  if (formats.length === 0) return [];
  const operations = [{ id: "convert", formats }];
  if (hasVideo && hasAudio) operations.push({ id: "extract-audio", formats: ["mp3"] });
  return operations;
}
