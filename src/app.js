import { DATA_AS_OF, LINKS, SHAREHOLDER } from "./data.js";
import { SEASONS, buildOptions, getSeason, jrePointCampaign, rankOptions, reminderIcs } from "./engine.js";

const $ = (id) => document.getElementById(id);
const yen = (n) => `${Math.round(n).toLocaleString("ja-JP")}円`;
const duration = (min) => `${Math.floor(min / 60)}時間${min % 60 ? `${min % 60}分` : ""}`;
const MODE_LABEL = { shinkansen: "🚄 新幹線", bus: "🚌 バス", local: "🚃 在来線" };
const SETTINGS_KEY = "ueno-niigata-settings";

function localDateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function jpDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = "日月火水木金土"[new Date(y, m - 1, d).getDay()];
  return `${m}月${d}日（${dow}）`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 保存できない環境（プライベートブラウズ等）では毎回入力してもらう
  }
}

function currentProfile() {
  return {
    hasCoupon: $("has-coupon").checked,
    couponPrice: Number($("coupon-price").value) || 0,
    otona: $("otona").value,
  };
}

function downloadReminder(title, date, description) {
  const blob = new Blob([reminderIcs({ title, date, description })], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ekinet-${date}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderCard(o, isBest) {
  return `
    <li class="card ${o.available ? "" : "disabled"} ${isBest ? "best" : ""}">
      <div class="card-head">
        <span class="badge ${o.mode}">${MODE_LABEL[o.mode]}</span>
        ${isBest ? '<span class="badge top">いちばん安い</span>' : ""}
        ${o.limited ? '<span class="badge limited">列車・席数限定</span>' : ""}
      </div>
      <h3>${escapeHtml(o.name)}</h3>
      <div class="price">${o.estimated ? "約" : ""}${yen(o.total)}</div>
      <div class="meta">
        <div class="status ${o.available ? "" : "warn"}">${escapeHtml(o.statusText)}</div>
        <div>所要 約${duration(o.minutes)}</div>
        <div class="sub">${escapeHtml(o.how)}</div>
      </div>
      <div class="links">
        <a href="${o.url}" target="_blank" rel="noopener">予約・確認する</a>
        ${o.bookFrom ? `<button type="button" class="remind" data-date="${o.bookFrom}" data-name="${escapeHtml(o.name)}">発売日をカレンダーに登録</button>` : ""}
      </div>
    </li>`;
}

function render() {
  const date = $("date").value;
  if (!date) return;
  const direction = document.querySelector('input[name="direction"]:checked').value;
  const today = localDateStr(new Date());
  const profile = currentProfile();
  saveSettings(profile);

  const ranked = rankOptions(buildOptions({ direction, date, today, profile }));
  const cheapest = ranked.find((o) => o.available);
  const cheapestShinkansen = ranked.find((o) => o.available && o.mode === "shinkansen");
  const route = direction === "down" ? "上野 → 新潟" : "新潟 → 上野";
  const season = SEASONS[getSeason(date)].label;

  $("summary").innerHTML = cheapest
    ? `<p class="lead">${jpDate(date)} ${route}（${season}）</p>
       <div class="pick">
         <div><span>新幹線でいちばん安い</span><strong>${escapeHtml(cheapestShinkansen.name)}</strong><em>${yen(cheapestShinkansen.total)}</em></div>
         ${cheapest.id !== cheapestShinkansen.id
           ? `<div><span>時間がかかってもよければ</span><strong>${escapeHtml(cheapest.name)}</strong><em>約${yen(cheapest.total)}</em></div>`
           : ""}
       </div>`
    : `<p class="warn">過去の日付です。乗る日を選び直してください。</p>`;

  const campaign = jrePointCampaign(date);
  $("alerts").innerHTML = campaign
    ? `<div class="alert">この日は <strong>JRE POINT特典 35%OFFキャンペーン</strong> の対象期間です（${campaign.start}〜${campaign.end} 乗車分）。
         ポイントがあれば、えきねっとの「新幹線eチケット（JRE POINT特典）」がお得です。
         <a href="${LINKS.jrePoint}" target="_blank" rel="noopener">詳しく見る</a></div>`
    : "";

  const shinkansenBestId = cheapestShinkansen?.id;
  $("results").innerHTML = ranked.map((o) => renderCard(o, o.id === shinkansenBestId)).join("");
  $("timetable-link").href = direction === "down" ? LINKS.timetable : LINKS.timetableUp;
}

function init() {
  const saved = loadSettings();
  $("has-coupon").checked = Boolean(saved.hasCoupon);
  $("coupon-price").value = saved.couponPrice ?? SHAREHOLDER.couponMarketPrice;
  $("otona").value = saved.otona ?? "none";

  const d = new Date();
  d.setDate(d.getDate() + 30);
  $("date").value = localDateStr(d);
  $("date").min = localDateStr(new Date());
  $("as-of").textContent = DATA_AS_OF;

  $("search").addEventListener("input", render);
  $("search").addEventListener("change", render);
  $("results").addEventListener("click", (e) => {
    const btn = e.target.closest(".remind");
    if (!btn) return;
    downloadReminder(
      `えきねっと予約開始 10:00（${btn.dataset.name}）`,
      btn.dataset.date,
      `${$("date").value} 乗車分の予約開始。${LINKS.ekinet}`,
    );
  });
  render();
}

init();
