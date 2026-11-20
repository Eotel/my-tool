export const TEXTS = {
  operations: {
    convert: { label: "形式を変える", run: (format) => `${format} に変える` },
    "extract-audio": { label: "音声だけ取り出す", run: () => "音声を取り出す" },
  },
  formats: {
    mp4: "ほとんどの機器で再生できる動画",
    webm: "Web ページに掲載しやすい動画",
    gif: "音声のない、繰り返し再生される画像",
    mp3: "音声だけのファイル",
  },
  status: {
    preparing: "準備中",
    checking: "ファイルを確認中",
    working: "処理中",
    done: "完了しました",
  },
  errors: {
    unreadable: "このファイルは変換できません",
    failed: "変換できませんでした",
  },
  save: (format) => `${format} を保存`,
  preview: "変換した結果",
};
