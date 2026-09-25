// 料金計算の純粋関数。DOM に依存しないので node:test でテストできる。
import { BUS, FARES, JRE_POINT_CAMPAIGNS, LINKS, MINUTES, OTONA, SHAREHOLDER, SPECIAL28_PERIODS } from "./data.js";

export const SEASONS = {
  peak: { label: "最繁忙期", add: 400 },
  high: { label: "繁忙期", add: 200 },
  regular: { label: "通常期", add: 0 },
  low: { label: "閑散期", add: -200 },
};

const md = (m, d) => m * 100 + d;
const floor10 = (n) => Math.floor(n / 10) * 10;

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// "2026-11-08" → "11月8日"
export function jpShortDate(dateStr) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}月${d}日`;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return formatDate(d);
}

// JR の「1ヶ月前の同じ日」。前月に同じ日がなければ前月末日。
export function oneMonthBefore(dateStr) {
  const d = parseDate(dateStr);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return formatDate(target);
}

export function daysUntil(dateStr, todayStr) {
  return Math.round((parseDate(dateStr) - parseDate(todayStr)) / 86400000);
}

export function isWeekday(dateStr) {
  const dow = parseDate(dateStr).getUTCDay();
  return dow >= 1 && dow <= 5;
}

// JR の指定席シーズン区分（簡略版）
export function getSeason(dateStr) {
  const date = parseDate(dateStr);
  const v = md(date.getUTCMonth() + 1, date.getUTCDate());
  const dow = date.getUTCDay();
  if (v >= md(12, 28) || v <= md(1, 6) || (v >= md(4, 27) && v <= md(5, 6)) || (v >= md(8, 10) && v <= md(8, 19))) {
    return "peak";
  }
  if ((v >= md(3, 21) && v <= md(4, 5)) || (v >= md(7, 21) && v <= md(8, 31)) || v >= md(12, 25) || v <= md(1, 10)) {
    return "high";
  }
  const lowPeriod =
    (v >= md(1, 16) && v <= md(2, 29)) || (v >= md(6, 1) && v <= md(6, 30)) ||
    (v >= md(9, 1) && v <= md(9, 30)) || (v >= md(11, 1) && v <= md(12, 20));
  if (lowPeriod && dow >= 1 && dow <= 4) return "low";
  return "regular";
}

const inRange = (date, { start, end }) => date >= start && date <= end;

/** 通常の指定席の発売開始（1ヶ月前の10:00） */
export function reservationOpens(date) {
  return oneMonthBefore(date);
}

/**
 * トクだ値スペシャル28 の状況。
 * status: "none"（設定なし）| "before"（発売前）| "open"（発売中）| "closed"（締切済）
 */
export function special28Status(date, today) {
  const period = SPECIAL28_PERIODS.find((p) => inRange(date, p));
  if (!period) return { status: "none", reason: "この日は設定期間外（期間限定の商品です）" };
  if (!isWeekday(date)) return { status: "none", reason: "平日限定（土日は設定なし）" };
  const opens = oneMonthBefore(date);
  const closes = addDays(date, -28);
  if (today < opens) return { status: "before", opens, closes };
  if (today > closes) return { status: "closed", opens, closes, reason: `${jpShortDate(closes)} 23:50 で予約締切済み` };
  return { status: "open", opens, closes };
}

export function jrePointCampaign(date) {
  return JRE_POINT_CAMPAIGNS.find((c) => inRange(date, c)) ?? null;
}

/**
 * 上野⇔新潟の選択肢をすべて作る。
 * profile: { hasCoupon: boolean, couponPrice: number, otona: "none"|"middle"|"zipangu" }
 */
export function buildOptions({ direction = "down", date, today, profile = {} }) {
  const { hasCoupon = false, couponPrice = SHAREHOLDER.couponMarketPrice, otona = "none" } = profile;
  const season = getSeason(date);
  const add = SEASONS[season].add;
  const days = daysUntil(date, today);
  const past = days < 0;
  const opens = reservationOpens(date);
  const beforeSale = today < opens;
  const reserved = FARES.reserved + add;
  const eticket = FARES.eticket + add;

  // 新幹線の予約状況（通常の指定席は1ヶ月前から）
  const shinkansenState = past
    ? { available: false, statusText: "過去の日付です" }
    : beforeSale
      ? { available: true, statusText: `${jpShortDate(opens)} 10:00 から予約開始` }
      : { available: true, statusText: "予約受付中" };

  const options = [
    {
      id: "eticket",
      mode: "shinkansen",
      name: "新幹線eチケット 指定席",
      total: eticket,
      minutes: MINUTES.shinkansen,
      ...shinkansenState,
      how: "えきねっとで予約し、交通系ICカードで改札を通る。全列車が対象",
      url: LINKS.ekinet,
    },
    {
      id: "reserved",
      mode: "shinkansen",
      name: "指定席（窓口・券売機のきっぷ）",
      total: reserved,
      minutes: MINUTES.shinkansen,
      ...shinkansenState,
      how: "eチケットより200円高いだけなので、えきねっとで買うほうが得",
      url: LINKS.ekinet,
    },
    {
      id: "unreserved",
      mode: "shinkansen",
      name: "自由席",
      total: FARES.unreserved,
      minutes: MINUTES.shinkansen,
      available: !past,
      statusText: past ? "過去の日付です" : "当日でも買える",
      how: "座れないこともある。通常期・閑散期は指定席との差が小さい",
      url: LINKS.ekinet,
    },
  ];

  // トクだ値スペシャル28（50%割引・平日・列車/席数限定）
  const s28 = special28Status(date, today);
  const s28Text =
    s28.status === "before"
      ? `${jpShortDate(s28.opens)} 10:00 発売開始（締切 ${jpShortDate(s28.closes)} 23:50）`
      : s28.status === "open"
        ? `発売中（締切 ${jpShortDate(s28.closes)} 23:50）`
        : s28.reason;
  options.push({
    id: "special28",
    mode: "shinkansen",
    name: "トクだ値スペシャル28（50%割引）",
    total: floor10(eticket / 2),
    minutes: MINUTES.shinkansen,
    available: s28.status === "open" || s28.status === "before",
    statusText: s28Text,
    bookFrom: s28.status === "before" ? s28.opens : undefined,
    how: "えきねっとで日付を入れて検索し、「トクだ値スペシャル28」と表示された「とき」が対象。列車・席数限定なので発売初日の10:00に予約するのが確実",
    url: LINKS.special28,
    limited: true,
  });

  // 株主優待割引券（4割引）
  const couponCost = hasCoupon ? 0 : couponPrice;
  const shareholderNote = hasCoupon ? "手持ちの優待券を使用" : `優待券の購入費 約${couponPrice.toLocaleString("ja-JP")}円を含む`;
  options.push(
    {
      id: "shareholder-reserved",
      mode: "shinkansen",
      name: "株主優待割引券 × 指定席",
      total: floor10(reserved * (1 - SHAREHOLDER.discount)) + couponCost,
      minutes: MINUTES.shinkansen,
      ...shinkansenState,
      how: `えきねっとの「新幹線eチケット（株主優待割）」で優待券の番号を入力。全列車が対象。${shareholderNote}`,
      url: LINKS.shareholderEticket,
    },
    {
      id: "shareholder-unreserved",
      mode: "shinkansen",
      name: "株主優待割引券 × 自由席",
      total: floor10(FARES.unreserved * (1 - SHAREHOLDER.discount)) + couponCost,
      minutes: MINUTES.shinkansen,
      available: !past,
      statusText: past ? "過去の日付です" : "当日でも使える",
      how: `優待券1枚で片道1人分。${shareholderNote}`,
      url: LINKS.shareholderEticket,
    },
  );

  // 大人の休日倶楽部（会員のときだけ表示）
  if (OTONA[otona]) {
    const club = OTONA[otona];
    options.push({
      id: `otona-${otona}`,
      mode: "shinkansen",
      name: `大人の休日倶楽部 ${club.label}`,
      total: floor10(reserved * (1 - club.discount)),
      minutes: MINUTES.shinkansen,
      ...shinkansenState,
      how: `えきねっとで「大人の休日倶楽部割引を利用する」を選んで予約。年会費 ${club.annualFee.toLocaleString("ja-JP")}円`,
      url: LINKS.otona,
    });
  }

  options.push(
    {
      id: "bus",
      mode: "bus",
      name: "高速バス（新宿・池袋・東京駅から）",
      total: BUS.fareFrom + BUS.transferFare,
      minutes: MINUTES.bus,
      available: !past,
      statusText: past ? "過去の日付です" : `最安クラスの目安。土休日や直前は ${BUS.typical.toLocaleString("ja-JP")}円前後`,
      how: "上野から直行便はないので、JRで新宿（バスタ新宿）か池袋へ移動して乗る。早めのWEB予約ほど安い",
      url: direction === "down" ? LINKS.busDown : LINKS.busUp,
      estimated: true,
    },
    {
      id: "local",
      mode: "local",
      name: "在来線の普通列車のみ",
      total: FARES.localTrain,
      minutes: MINUTES.localTrain,
      available: !past,
      statusText: past ? "過去の日付です" : "いつでも買える（乗車券のみ）",
      how: "高崎・水上・長岡で乗り換え、約7時間。青春18きっぷの期間ならさらに安い",
      url: LINKS.ekinet,
      estimated: true,
    },
  );

  return options.map((o) => ({ ...o, season }));
}

/** 予約できる選択肢を安い順に。予約できないものは末尾。 */
export function rankOptions(options) {
  return [...options].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.total - b.total || a.minutes - b.minutes;
  });
}

/** 予約開始日をカレンダーに登録するための .ics 文字列 */
export function reminderIcs({ title, date, time = "0955", description = "" }) {
  const d = date.replaceAll("-", "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ueno-niigata//JA",
    "BEGIN:VEVENT",
    `UID:${d}-${time}-${Math.random().toString(36).slice(2)}@ueno-niigata`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Asia/Tokyo:${d}T${time}00`,
    `DURATION:PT15M`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT5M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
