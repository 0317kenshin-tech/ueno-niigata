// 株主優待券（JR東日本）の販売価格をショップごとに取得し data/prices.json に保存する。
// 取れなかったショップは前回の値を残す（stale: true）。
import { fetchText, htmlToText, readJson, writeJson } from "./lib.mjs";

const OUT = new URL("../data/prices.json", import.meta.url);
// 現行券（2026/7/1〜2027/6/30）の表記ゆれ
const VALIDITY = /2027\s*[年/.\-]\s*0?6\s*[月/.\-]\s*30/;

const SHOPS = [
  { id: "kabuyu", name: "株優エクスプレス", url: "https://www.life1.co.jp/code/jre-buy/", delivery: "番号をメールで即納" },
  { id: "tickety", name: "チケッティ", url: "https://www.tickety.jp/sell/train/jrhigashinihon-kabu/single.php", delivery: "郵送（番号通知は姉妹店の株優NOW）" },
  { id: "access", name: "アクセスチケット", url: "https://www.access-ticket.com/products/detail/5432", delivery: "郵送" },
  { id: "jrsale", name: "JR株主優待.com", url: "https://jr-sale.com/", delivery: "番号をメールで即納" },
  { id: "ranger", name: "チケットレンジャー", url: "https://www.ticketlife.jp/kaitai/2302/", delivery: "郵送" },
];

// 「JR東日本」の商品名の直後にある有効期限の、すぐ後ろに出てくる金額を1枚の価格とみなす。
// 同じページに JR東海・西日本・九州 などの券が並ぶので、間に別の商品名が挟まったら採用しない。
const OTHER_ITEM = /JR東海|JR西日本|JR九州|JR北海道|JR四国|サービス券|ANA|JAL/;

export function extractPrice(text) {
  const prices = [];
  for (const m of text.matchAll(new RegExp(VALIDITY, "g"))) {
    if (!text.slice(Math.max(0, m.index - 80), m.index).includes("JR東日本")) continue;
    const after = text.slice(m.index, m.index + 250);
    const p = /(?:¥\s*([1-6],?\d{3}))|(?:([1-6],?\d{3})\s*円)/.exec(after);
    if (!p || OTHER_ITEM.test(after.slice(0, p.index))) continue;
    const n = Number((p[1] ?? p[2]).replace(",", ""));
    if (n >= 1500 && n <= 6000) prices.push(n);
  }
  return prices.length ? Math.min(...prices) : null;
}

const prev = await readJson(OUT, { shops: [] });
const shops = [];
for (const shop of SHOPS) {
  const before = prev.shops.find((s) => s.id === shop.id);
  try {
    const text = htmlToText(await fetchText(shop.url));
    const price = extractPrice(text);
    const hit = text.search(VALIDITY);
    console.log(`[${shop.id}] price=${price} validityAt=${hit} len=${text.length}`);
    if (process.env.DEBUG) console.log(text.slice(Math.max(0, hit - 400), hit + 400));
    if (price) {
      shops.push({ ...shop, price, checkedAt: new Date().toISOString(), stale: false });
      continue;
    }
  } catch (e) {
    console.log(`[${shop.id}] error: ${e.message}`);
  }
  if (before) shops.push({ ...before, stale: true });
}

shops.sort((a, b) => a.price - b.price);
await writeJson(OUT, { updatedAt: new Date().toISOString(), shops });
console.log(JSON.stringify(shops, null, 2));
