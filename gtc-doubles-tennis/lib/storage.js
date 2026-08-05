// Data access layer backed by Supabase. Reads work for everyone; writes
// (insert/update/delete) are only allowed for a logged-in admin — enforced
// server-side by Supabase Row Level Security (see supabase/schema.sql), not
// just hidden in the UI.

import { supabase } from "./supabaseClient";

const DEFAULT_RATING = 5; // 1 (weakest) to 10 (strongest)

function normalizeRoundsPayload(roundsPayload) {
  if (Array.isArray(roundsPayload)) return roundsPayload;
  if (roundsPayload && Array.isArray(roundsPayload.rounds)) return roundsPayload.rounds;
  return [];
}

function normalizeWeek(week) {
  if (!week) return null;
  const roundsPayload = week.rounds;
  const normalizedRounds = normalizeRoundsPayload(roundsPayload);
  const category =
    (roundsPayload && typeof roundsPayload === "object" && !Array.isArray(roundsPayload) && roundsPayload.category) ||
    week.category ||
    "Uncategorized";

  return {
    ...week,
    category,
    num_rounds: week.num_rounds ?? week.numRounds ?? 3,
    rounds: normalizedRounds,
  };
}

function toStoredRounds(rounds, category) {
  return {
    category: (category || "Uncategorized").trim() || "Uncategorized",
    rounds: normalizeRoundsPayload(rounds),
  };
}

// ---------- Date helpers ----------

// Returns the ISO (yyyy-mm-dd) date of the upcoming Thursday, or today if
// today is already Thursday.
export function getDefaultMatchDate() {
  const today = new Date();
  const dow = today.getDay(); // 0 Sun ... 6 Sat
  const diff = (4 - dow + 7) % 7;
  const target = new Date(today);
  target.setDate(today.getDate() + diff);
  return target.toISOString().slice(0, 10);
}

export function formatDateLong(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------- Players ----------

export async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addPlayer(name, rating = DEFAULT_RATING) {
  const trimmed = (name || "").trim();
  if (!trimmed) return getPlayers();
  const clampedRating = Math.max(1, Math.min(10, Number(rating) || DEFAULT_RATING));
  const { error } = await supabase
    .from("players")
    .insert({ name: trimmed, rating: clampedRating });
  if (error) {
    if (error.code === "23505") {
      throw new Error(`${trimmed} is already on the list.`);
    }
    throw error;
  }
  return getPlayers();
}

export async function updatePlayer(id, { name, rating }) {
  const patch = {};
  if (name !== undefined && name.trim()) patch.name = name.trim();
  if (rating !== undefined) {
    patch.rating = Math.max(1, Math.min(10, Number(rating) || DEFAULT_RATING));
  }
  const { error } = await supabase.from("players").update(patch).eq("id", id);
  if (error) throw error;
  return getPlayers();
}

export async function deletePlayer(id) {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
  return getPlayers();
}

// ---------- Weeks ----------
// A "week" is one Thursday's (or chosen date's) session: a set of generated
// rounds, each holding courts with team names and (once entered) scores.

export async function getWeeks() {
  const { data, error } = await supabase
    .from("weeks")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeWeek);
}

export async function getWeek(id) {
  const { data, error } = await supabase
    .from("weeks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return normalizeWeek(data);
}

export async function findWeekByDate(date) {
  const { data, error } = await supabase
    .from("weeks")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return normalizeWeek(data);
}

export async function getCategories() {
  const weeks = await getWeeks();
  return [...new Set(weeks.map((week) => week.category).filter(Boolean))].sort();
}

// Creates a new week, or overwrites an existing one (matched by id, or by
// date if no id is given).
export async function saveWeek({ id, date, numRounds, rounds, category }) {
  const payload = {
    date,
    num_rounds: numRounds ?? 3,
    rounds: toStoredRounds(rounds, category),
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from("weeks")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return normalizeWeek(data);
  }

  const { data, error } = await supabase
    .from("weeks")
    .insert(payload)
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      // A week for this date already exists — update it instead.
      const existing = await findWeekByDate(date);
      if (existing) return saveWeek({ id: existing.id, date, numRounds, rounds, category });
    }
    throw error;
  }
  return normalizeWeek(data);
}

// Saves one court's score within a week and marks it as saved.
export async function saveCourtResult(weekId, roundNumber, courtNumber, scoreA, scoreB, currentRounds = null) {
  const week = await getWeek(weekId);
  if (!week) return null;
  const sourceRounds = currentRounds && Array.isArray(currentRounds) ? currentRounds : week.rounds;
  const rounds = sourceRounds.map((r) => {
    if (r.round !== roundNumber) return r;
    return {
      ...r,
      courts: r.courts.map((c) =>
        c.court === courtNumber ? { ...c, scoreA, scoreB, saved: true } : c
      ),
    };
  });
  return saveWeek({
    id: weekId,
    date: week.date,
    numRounds: week.num_rounds,
    rounds,
    category: week.category,
  });
}

export async function deleteWeek(id) {
  const { error } = await supabase.from("weeks").delete().eq("id", id);
  if (error) throw error;
  return getWeeks();
}

// ---------- Stats ----------
// A "set" = one court's result, in one round, in one week.

export async function computeStats(category = null) {
  const [weeks, players] = await Promise.all([getWeeks(), getPlayers()]);
  const stats = {};

  players.forEach((p) => {
    stats[p.name] = { name: p.name, rating: p.rating, played: 0, won: 0 };
  });

  function ensure(name) {
    if (!stats[name]) {
      stats[name] = { name, rating: null, played: 0, won: 0 };
    }
    return stats[name];
  }

  weeks
    .filter((week) => !category || week.category === category)
    .forEach((week) => {
      (week.rounds || []).forEach((r) => {
        r.courts.forEach((c) => {
          if (!c.saved) return;
          const scoreA = Number(c.scoreA);
          const scoreB = Number(c.scoreB);
          if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return;
          const winner = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";
          c.teamA.forEach((name) => {
            const s = ensure(name);
            s.played++;
            if (winner === "A" || winner === null) s.won++;
          });
          c.teamB.forEach((name) => {
            const s = ensure(name);
            s.played++;
            if (winner === "B" || winner === null) s.won++;
          });
        });
      });
    });

  return Object.values(stats)
    .filter((s) => s.played > 0)
    .map((s) => ({ ...s, winPct: s.played ? Math.round((s.won / s.played) * 100) : 0 }))
    .sort((a, b) => b.winPct - a.winPct || b.played - a.played);
}
