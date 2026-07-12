// Runnable self-check: `npm run test:logic`. assert-based, no framework.
// Force a western timezone so the date-parsing regression below is deterministic
// on any machine (bare "YYYY-MM-DD" parses as UTC, which only misbehaves west of it).
process.env.TZ = "America/Los_Angeles";
import assert from "node:assert";
import {
  fmt,
  getWeekStart,
  weeklyCount,
  allTimeCount,
  currentStreak,
  checkWeekRollover,
  newState,
} from "./logic";
import { AppState } from "./types";

// getWeekStart: Monday returns itself; Sunday returns the prior Monday.
const mon = new Date(2026, 6, 6); // Mon Jul 6 2026
const sun = new Date(2026, 6, 12); // Sun Jul 12 2026
assert.equal(fmt(getWeekStart(mon)), "2026-07-06", "Monday -> itself");
assert.equal(fmt(getWeekStart(sun)), "2026-07-06", "Sunday -> prior Monday");
assert.equal(
  fmt(getWeekStart(new Date(2026, 6, 8))),
  "2026-07-06",
  "Wed -> that Monday"
);

// weeklyCount: only true days within the Mon..Sun window count.
const log: AppState["log"] = {
  "2026-07-06": { person1: true },
  "2026-07-07": { person1: true, person2: true },
  "2026-07-13": { person1: true }, // next week — excluded
};
assert.equal(weeklyCount(log, getWeekStart(mon), "person1"), 2, "p1 week=2");
assert.equal(weeklyCount(log, getWeekStart(mon), "person2"), 1, "p2 week=1");
assert.equal(allTimeCount(log, "person1"), 3, "p1 all-time=3");

// currentStreak: counts back from today; if today unlogged, starts yesterday.
const now = new Date(2026, 6, 12, 10, 0, 0); // Sun
const streakLog: AppState["log"] = {
  "2026-07-10": { person1: true },
  "2026-07-11": { person1: true },
  // 07-12 (today) not logged -> streak still 2 counting back from yesterday
};
assert.equal(currentStreak(streakLog, "person1", now), 2, "streak from yesterday");
streakLog["2026-07-12"] = { person1: true };
assert.equal(currentStreak(streakLog, "person1", now), 3, "streak incl today");

// checkWeekRollover: a missed goal in the just-ended week creates one auto favor.
const s = newState("A", 3, "B", 3, mon); // lastWeekProcessed = 2026-07-06
s.log["2026-07-06"] = { person1: true }; // p1 got 1/3 last week; p2 got 0/3
const nextWeek = new Date(2026, 6, 13); // Mon Jul 13 -> a week elapsed
let seq = 0;
const changed = checkWeekRollover(s, nextWeek, () => (seq++ ? 0.222 : 0.111));
assert.equal(changed, true, "rollover changed state");
assert.equal(s.favors.length, 2, "both missed -> 2 favors");
assert.equal(s.favors[0].ower, "person1", "favor ower p1");
assert.equal(s.favors[0].auto, true, "auto favor");
assert.equal(
  s.favors[0].text,
  "Missed weekly goal (1/3 days) — owes a favor",
  "favor wording"
);
assert.equal(s.lastWeekProcessed, "2026-07-13", "lastWeekProcessed advanced");

// Idempotent within the same week (no double-processing).
assert.equal(checkWeekRollover(s, nextWeek, Math.random), false, "no re-run same week");
assert.equal(s.favors.length, 2, "still 2 favors");

// Regression: rollover must read lastWeekProcessed as LOCAL midnight. A Sunday
// (last day of the elapsed week) log has to count toward that week's goal. Under
// the old UTC parse the window shifted back a day, dropping this Sunday and
// wrongly creating a favor for a goal that was actually met.
const tz = newState("A", 1, "B", 1, mon); // goal 1/wk, lastWeekProcessed = 2026-07-06
tz.log["2026-07-12"] = { person1: true, person2: true }; // Sun of that week — meets 1/1
const tzChanged = checkWeekRollover(tz, nextWeek, Math.random);
assert.equal(tzChanged, true, "tz: rollover advanced the week");
assert.equal(tz.favors.length, 0, "tz: Sunday log counts -> no favor owed");

console.log("✓ all logic checks passed");
