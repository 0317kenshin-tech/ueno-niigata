// トクだ値スペシャル28 の監視。毎朝 9:30（日本時間）に Actions から実行する。
// 1. 新しい発表（ニュース・えきねっとのページの変化）を見つけたら通知
// 2. 登録済みの期間について、今日が発売開始日なら 10:00 前に通知
import { SPECIAL28_PERIODS } from "../src/data.js";
import { addDays, isWeekday, jpShortDate, oneMonthBefore } from "../src/engine.js";
import { fetchText, htmlToText, notify, readJson, todayJst, writeJson } from "./lib.mjs";

const STATE = new URL("../data/watch-state.json", import.meta.url);
const SITE = "https://0317kenshin-tech.github.io/ueno-niigata/";
const NEWS_RSS =
  "https://news.google.com/rss/search?q=%22%E3%83%88%E3%82%AF%E3%81%A0%E5%80%A4%E3%82%B9%E3%83%9A%E3%82%B7%E3%83%A3%E3%83%AB28%22&hl=ja&gl=JP&ceid=JP:ja";
const EKINET_PAGE = "https://www.eki-net.com/top/tokudane/";

const state = await readJson(STATE, { seenNews: [], ekinetSnippet: null, remindedSaleDays: [] });
// 初回は既存のニュースを既読にするだけで通知しない
const firstRun = state.seenNews.length === 0 && state.ekinetSnippet === null;
const today = todayJst();

// --- 1a. ニュース ---
try {
  const xml = await fetchText(NEWS_RSS);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => ({
    title: /<title>([\s\S]*?)<\/title>/.exec(body)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
    link: /<link>([\s\S]*?)<\/link>/.exec(body)?.[1]?.trim(),
    date: new Date(/<pubDate>([\s\S]*?)<\/pubDate>/.exec(body)?.[1] ?? 0),
  }));
  console.log(`news: ${items.length} items`);
  // 検索結果には古い記事も混ざるので、直近14日以内の未読記事だけを新着とする
  const fresh = items.filter((i) => i.link && !state.seenNews.includes(i.link) && Date.now() - i.date < 14 * 86400e3);
  if (!firstRun && fresh.length) {
    await notify({
      title: "トクだ値スペシャル28 の新しいお知らせ",
      message: fresh.slice(0, 3).map((i) => `・${i.title}`).join("\n") + "\n\n新しい期間なら、サイトの期間データを更新してください。",
      click: fresh[0].link,
    });
  }
  state.seenNews = [...new Set([...items.map((i) => i.link).filter(Boolean), ...state.seenNews])].slice(0, 300);
} catch (e) {
  console.log(`news error: ${e.message}`);
}

// --- 1b. えきねっとのトクだ値ページ ---
try {
  const text = htmlToText(await fetchText(EKINET_PAGE));
  const snippet = [...text.matchAll(/[^。]{0,120}スペシャル\s*28[^。]{0,160}/g)].map((m) => m[0].trim()).join(" / ") || "(記載なし)";
  console.log(`ekinet snippet: ${snippet.slice(0, 500)}`);
  if (!firstRun && state.ekinetSnippet !== null && snippet !== state.ekinetSnippet && snippet !== "(記載なし)") {
    await notify({ title: "えきねっとのトクだ値スペシャル28 の案内が更新されました", message: snippet.slice(0, 400), click: EKINET_PAGE });
  }
  state.ekinetSnippet = snippet;
} catch (e) {
  console.log(`ekinet error: ${e.message}`);
}

// --- 2. 発売開始日のリマインド ---
const saleTargets = [];
for (const { start, end } of SPECIAL28_PERIODS) {
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (isWeekday(d) && oneMonthBefore(d) === today) saleTargets.push(d);
  }
}
if (saleTargets.length && !state.remindedSaleDays.includes(today)) {
  await notify({
    title: "今日10:00 トクだ値スペシャル28 発売開始",
    message: `${saleTargets.map(jpShortDate).join("・")} 乗車分（上野⇔新潟 片道 約5,300円）が今日10:00に発売されます。列車・席数限定なので10:00ちょうどに予約を。`,
    click: SITE,
  });
  state.remindedSaleDays = [today, ...state.remindedSaleDays].slice(0, 60);
}

await writeJson(STATE, state);
console.log(firstRun ? "first run: baseline saved without notifying" : "done");
