// Pure business logic — ported verbatim from exercise-duel.html <script>.
// No React / storage / platform deps here so it stays testable (see logic.test.ts).
import { AppState, Favor, PersonId } from "./types";

/* ---------------- date helpers ---------------- */
const pad = (n: number) => (n < 10 ? "0" + n : "" + n);

/** Local calendar date "YYYY-MM-DD" (not UTC). */
export function fmt(d: Date): string {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

export function todayStr(now: Date = new Date()): string {
  return fmt(now);
}

/** Most recent Monday at local midnight (if `d` is Monday, returns that day). */
export function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/* ---------------- counts ---------------- */
export function weeklyCount(
  log: AppState["log"],
  weekStartDate: Date,
  person: PersonId
): number {
  let c = 0;
  for (let i = 0; i < 7; i++) {
    const key = fmt(addDays(weekStartDate, i));
    if (log[key] && log[key][person]) c++;
  }
  return c;
}

export function allTimeCount(log: AppState["log"], person: PersonId): number {
  let c = 0;
  for (const k in log) {
    if (log[k] && log[k][person]) c++;
  }
  return c;
}

/** Walk back from today; if today isn't logged, start yesterday. Count until a gap. */
export function currentStreak(
  log: AppState["log"],
  person: PersonId,
  now: Date = new Date()
): number {
  let count = 0;
  let cursor = new Date(now);
  const todayKey = fmt(now);
  if (!(log[todayKey] && log[todayKey][person])) cursor = addDays(cursor, -1);
  while (true) {
    const key = fmt(cursor);
    if (log[key] && log[key][person]) {
      count++;
      cursor = addDays(cursor, -1);
    } else break;
  }
  return count;
}

export const other = (p: PersonId): PersonId =>
  p === "person1" ? "person2" : "person1";

export function newFavorId(now: number, rand: number): string {
  return "f" + now + rand.toString(36).slice(2, 7);
}

/* ---------------- week rollover / auto favors ---------------- */
/**
 * Mutates `s` in place. Returns true if state changed (caller should persist).
 * Evaluates only the single most-recently-elapsed week — no backfill (matches
 * the prototype's intentionally simple behavior).
 */
export function checkWeekRollover(
  s: AppState,
  now: Date = new Date(),
  rand: () => number = Math.random
): boolean {
  const currentStart = fmt(getWeekStart(now));
  if (s.lastWeekProcessed && s.lastWeekProcessed !== currentStart) {
    // Parse as LOCAL midnight — bare "YYYY-MM-DD" would parse as UTC, shifting
    // the 7-day window a day back in western timezones and skewing auto-favors.
    const prevStart = new Date(s.lastWeekProcessed + "T00:00:00");
    (["person1", "person2"] as PersonId[]).forEach((person) => {
      const count = weeklyCount(s.log, prevStart, person);
      const goal = s.profiles[person].goal;
      if (count < goal) {
        const favor: Favor = {
          id: newFavorId(now.getTime(), rand()),
          ower: person,
          owed: other(person),
          text: `Missed weekly goal (${count}/${goal} days) — owes a favor`,
          status: "pending",
          createdAt: now.getTime(),
          auto: true,
        };
        s.favors.push(favor);
      }
    });
    s.lastWeekProcessed = currentStart;
    return true;
  }
  return false;
}

export const PRESET_FAVORS = [
  "Cook dinner tonight",
  "Give a 15-min massage",
  "Do the dishes for a day",
  "Pick tomorrow's movie",
  "Coffee run",
  "Handle the laundry",
  "Plan the next date night",
  "Give up the aux cord for a day",
  "Breakfast in bed",
];

/** Fresh state for a new couple. */
export function newState(
  name1: string,
  goal1: number,
  name2: string,
  goal2: number,
  now: Date = new Date()
): AppState {
  return {
    profiles: {
      person1: { name: name1, goal: goal1 },
      person2: { name: name2, goal: goal2 },
    },
    log: {},
    favors: [],
    lastWeekProcessed: fmt(getWeekStart(now)),
  };
}
