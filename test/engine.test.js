import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOptions, getSeason, oneMonthBefore, rankOptions, special28Status, trainSearchUrl } from "../src/engine.js";

const TODAY = "2026-09-25";
const byId = (opts, id) => opts.find((o) => o.id === id);

test("oneMonthBefore clamps to month end", () => {
  assert.equal(oneMonthBefore("2026-12-07"), "2026-11-07");
  assert.equal(oneMonthBefore("2026-03-31"), "2026-02-28");
  assert.equal(oneMonthBefore("2027-01-15"), "2026-12-15");
});

test("season classification", () => {
  assert.equal(getSeason("2026-12-30"), "peak");
  assert.equal(getSeason("2026-12-08"), "low"); // Tue
  assert.equal(getSeason("2026-10-17"), "regular");
});

test("regular-season fares match published prices", () => {
  const opts = buildOptions({ date: "2026-10-17", today: TODAY });
  assert.equal(byId(opts, "reserved").total, 10980);
  assert.equal(byId(opts, "eticket").total, 10780);
  assert.equal(byId(opts, "unreserved").total, 10450);
  // 株主優待（手持ち）: 指定席 6,580円 / 自由席 6,270円
  const withCoupon = buildOptions({ date: "2026-10-17", today: TODAY, profile: { hasCoupon: true } });
  assert.equal(byId(withCoupon, "shareholder-reserved").total, 6580);
  assert.equal(byId(withCoupon, "shareholder-unreserved").total, 6270);
});

test("buying a coupon adds its price", () => {
  const opts = buildOptions({ date: "2026-10-17", today: TODAY, profile: { couponPrice: 3200 } });
  assert.equal(byId(opts, "shareholder-reserved").total, 6580 + 3200);
});

test("special28: weekday-only, period-limited, sold 1 month to 28 days before", () => {
  assert.equal(special28Status("2026-10-20", TODAY).status, "closed"); // deadline was 9/22
  assert.equal(special28Status("2026-12-12", TODAY).status, "none"); // Saturday
  assert.equal(special28Status("2026-11-10", TODAY).status, "none"); // outside period
  const dec = special28Status("2026-12-08", TODAY);
  assert.deepEqual(dec, { status: "before", opens: "2026-11-08", closes: "2026-11-10" });
  assert.equal(special28Status("2026-12-08", "2026-11-09").status, "open");
  assert.equal(special28Status("2026-12-08", "2026-11-11").status, "closed");
});

test("special28 is half of the e-ticket price", () => {
  const opts = buildOptions({ date: "2026-12-08", today: TODAY }); // 閑散期
  assert.equal(byId(opts, "eticket").total, 10580);
  assert.equal(byId(opts, "special28").total, 5290);
  assert.equal(byId(opts, "special28").bookFrom, "2026-11-08");
});

test("otona club only appears for members", () => {
  assert.equal(byId(buildOptions({ date: "2026-10-17", today: TODAY }), "otona-zipangu"), undefined);
  const opts = buildOptions({ date: "2026-10-17", today: TODAY, profile: { otona: "zipangu" } });
  assert.equal(byId(opts, "otona-zipangu").total, 7680);
});

test("ranking: unavailable last, then cheapest first", () => {
  const ranked = rankOptions(buildOptions({ date: "2026-10-20", today: TODAY }));
  assert.equal(ranked.at(-1).id, "special28");
  assert.equal(ranked[0].id, "bus");
  const avail = ranked.filter((o) => o.available);
  for (let i = 1; i < avail.length; i++) assert.ok(avail[i - 1].total <= avail[i].total);
});

test("past dates are unavailable", () => {
  assert.ok(buildOptions({ date: "2026-09-20", today: TODAY }).every((o) => !o.available));
});

test("train search URL carries direction, date and time", () => {
  const url = new URL(trainSearchUrl({ direction: "up", date: "2026-12-08", time: "17:30" }));
  const q = url.searchParams;
  assert.equal(q.get("from"), "新潟");
  assert.equal(q.get("to"), "上野");
  assert.deepEqual([q.get("y"), q.get("m"), q.get("d"), q.get("hh"), q.get("m1"), q.get("m2")], ["2026", "12", "08", "17", "3", "0"]);
});
