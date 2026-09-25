// Actions のスクリプト共通処理
import { readFile, writeFile } from "node:fs/promises";

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

export async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ja" }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder("latin1").decode(buf.slice(0, 4000));
  const charset = /charset=["']?(shift_jis|sjis|x-sjis|euc-jp|utf-8)/i.exec(res.headers.get("content-type") + head)?.[1] ?? "utf-8";
  return new TextDecoder(/s(hift_)?jis/i.test(charset) ? "shift_jis" : charset).decode(buf);
}

export function htmlToText(html) {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&yen;|&#165;|￥/g, "¥")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

export async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2) + "\n");
}

// 日本時間の今日 "YYYY-MM-DD"
export function todayJst() {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}

/** 奥さんのスマホ（ntfy）と GitHub Issue に通知する */
export async function notify({ title, message, click }) {
  console.log(`NOTIFY: ${title}\n${message}\n${click ?? ""}`);
  const topic = process.env.NTFY_TOPIC;
  if (topic) {
    const res = await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, title, message, click, tags: ["train"], priority: 4 }),
    });
    console.log(`ntfy: ${res.status}`);
  }
  const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
  if (GITHUB_TOKEN && GITHUB_REPOSITORY) {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/issues`, {
      method: "POST",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
      body: JSON.stringify({ title, body: `${message}\n\n${click ?? ""}` }),
    });
    console.log(`issue: ${res.status}`);
  }
}
