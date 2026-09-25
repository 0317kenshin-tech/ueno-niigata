// 上野⇔新潟の運賃・割引データ（片道・大人1名）。
// 2026年9月時点で公開されていた情報をもとにした値。改定・キャンペーン終了があるので
// 数値を直したら DATA_AS_OF も更新すること。上野発と東京発は同額。
export const DATA_AS_OF = "2026年9月調べ";

export const FARES = {
  // 2026年3月14日改定後の通常期。指定席は季節で ±200〜400円
  reserved: 10980, // とき 普通車指定席（窓口・券売機のきっぷ）
  eticket: 10780, // 新幹線eチケット（えきねっと）指定席は一律200円引き
  unreserved: 10450, // 自由席（季節変動なし）
  localTrain: 6200, // 在来線の普通列車のみ（乗車券だけ。改定後の概算）
};

export const MINUTES = {
  shinkansen: 125, // とき（上野〜新潟 約1時間50分〜2時間10分）
  localTrain: 420, // 高崎・水上・長岡で乗り換え
  bus: 300, // 新宿・池袋〜新潟 約4時間35分〜5時間。上野からの移動を含めた目安
};

// 株主優待割引券: 1枚で片道1名の運賃・料金が4割引
export const SHAREHOLDER = {
  discount: 0.4,
  couponMarketPrice: 3200, // 金券ショップの販売価格の目安（2026/7/1〜2027/6/30 有効券）
  validUntil: "2027-06-30",
};

// 大人の休日倶楽部（JR東日本線を片道101km以上で割引）
export const OTONA = {
  middle: { label: "ミドル（50歳以上）", discount: 0.05, annualFee: 2624 },
  zipangu: { label: "ジパング（女性60歳以上）", discount: 0.3, annualFee: 4364 },
};

// えきねっと「新幹線eチケット（トクだ値スペシャル28）」: 平日限定・列車/席数限定で50%割引。
// 予約は乗車日の1ヶ月前10:00〜28日前23:50。通年販売ではなく、期間ごとに発表される。
export const SPECIAL28_PERIODS = [
  { start: "2026-10-14", end: "2026-10-27" },
  { start: "2026-12-07", end: "2026-12-17" },
];

// JRE POINT特典（新幹線eチケット）の35%OFFキャンペーン
export const JRE_POINT_CAMPAIGNS = [
  { start: "2026-09-25", end: "2026-10-09", bookingOpens: "2026-08-25" },
  { start: "2027-01-18", end: "2027-01-31", bookingOpens: "2026-12-18" },
];

// 高速バス（上野発の直行便はないので、新宿・池袋・東京駅から乗る）
export const BUS = {
  fareFrom: 2500, // バスタ新宿発の最安クラス（平日・早めの予約）
  typical: 5500, // 通常運賃の目安
  transferFare: 210, // 上野〜新宿/池袋の JR 運賃の目安
};

export const LINKS = {
  ekinet: "https://www.eki-net.com/",
  special28: "https://www.eki-net.com/top/tokudane/",
  shareholderEticket: "https://www.eki-net.com/top/e-ticket/",
  jrePoint: "https://www.eki-net.com/top/product/shinkansen/e-tokuten.html",
  otona: "https://www.jreast.co.jp/otona/",
  timetable: "https://www.navitime.co.jp/diagram/depArrTimeList?departure=00004067&arrival=00004192&line=00000148&updown=1",
  timetableUp: "https://www.navitime.co.jp/diagram/depArrTimeList?departure=00004192&arrival=00004067&line=00000148&updown=0",
  busDown: "https://www.bushikaku.net/search/tokyo_niigata/",
  busUp: "https://www.bushikaku.net/search/niigata_tokyo/",
  couponShop: "https://www.tickety.jp/sell/train/jrhigashinihon-kabu/single.php",
};
