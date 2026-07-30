"use client";

import { useEffect, useState } from "react";
import { getWeeks, saveCourtResult, deleteWeek, formatDateLong } from "../../lib/storage";
import { useAuth } from "../components/AuthProvider";

export default function RecordPage() {
  const { isAdmin, loading: authLoading } = useAuth();

  const [weeks, setWeeks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [scores, setScores] = useState({}); // key: "round-court" -> {a, b}
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await getWeeks();
        setWeeks(all);
        if (all.length > 0) setActiveId(all[0].id);
      } catch (err) {
        setLoadError("Couldn't load data — check your internet connection and try refreshing.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeWeek = weeks.find((w) => w.id === activeId) || null;

  function keyFor(round, court) {
    return `${round}-${court}`;
  }

  function scoreValue(round, court, side, courtObj) {
    const key = keyFor(round, court);
    if (scores[key] && scores[key][side] !== undefined) return scores[key][side];
    const stored = side === "a" ? courtObj.scoreA : courtObj.scoreB;
    return stored ?? "";
  }

  function setScore(round, court, side, value) {
    const key = keyFor(round, court);
    setScores((prev) => ({ ...prev, [key]: { ...prev[key], [side]: value } }));
  }

  async function handleSave(round, court) {
    const key = keyFor(round, court);
    const s = scores[key] || {};
    const roundObj = activeWeek.rounds.find((r) => r.round === round);
    const courtObj = roundObj.courts.find((c) => c.court === court);
    const scoreA = Number(s.a ?? courtObj.scoreA ?? 0);
    const scoreB = Number(s.b ?? courtObj.scoreB ?? 0);
    setBusy(true);
    try {
      await saveCourtResult(activeWeek.id, round, court, scoreA, scoreB);
      const refreshed = await getWeeks();
      setWeeks(refreshed);
      setScores((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      alert(err.message || "Couldn't save that result.");
    } finally {
      setBusy(false);
    }
  }

  async function removeWeek(id) {
    if (!confirm("Delete this whole week's matches and results?")) return;
    setBusy(true);
    try {
      const updated = await deleteWeek(id);
      setWeeks(updated);
      if (activeId === id) setActiveId(updated[0]?.id ?? null);
    } catch (err) {
      alert(err.message || "Couldn't delete that week.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading) return <p className="subtle">Loading&hellip;</p>;

  if (loadError) {
    return (
      <div>
        <h1>Record Results</h1>
        <p style={{ color: "#f87171" }}>{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Record Results</h1>
      {!isAdmin && (
        <p className="subtle">
          Viewing only — <a href="/admin" style={{ color: "#d7c9e0" }}>log in as admin</a> to
          enter or edit results.
        </p>
      )}

      {weeks.length === 0 && (
        <p className="subtle">No matches generated yet &mdash; go to the Generate tab first.</p>
      )}

      {weeks.length > 0 && (
        <div className="week-list">
          {weeks.map((w) => (
            <button
              key={w.id}
              className={`week-chip${w.id === activeId ? " active" : ""}`}
              onClick={() => setActiveId(w.id)}
            >
              {formatDateLong(w.date)}
            </button>
          ))}
        </div>
      )}

      {activeWeek && (
        <div style={{ marginTop: 8 }}>
          <div className="list-row" style={{ borderBottom: "none" }}>
            <h2 style={{ margin: 0 }}>{formatDateLong(activeWeek.date)}</h2>
            {isAdmin && (
              <button className="danger" onClick={() => removeWeek(activeWeek.id)} disabled={busy}>
                Delete week
              </button>
            )}
          </div>

          {activeWeek.rounds.map((r) => (
            <div key={r.round}>
              <h2>Round {r.round}</h2>
              {r.courts.map((c) => (
                <div className="court-card" key={c.court}>
                  <h3>Court {c.court}</h3>
                  {isAdmin ? (
                    <>
                      <div className="vs-row">
                        <span className="team-name">{c.teamA.join(" & ")}</span>
                        <input
                          type="number"
                          style={{ width: 60 }}
                          value={scoreValue(r.round, c.court, "a", c)}
                          onChange={(e) => setScore(r.round, c.court, "a", e.target.value)}
                        />
                      </div>
                      <div className="vs-row">
                        <span className="team-name">{c.teamB.join(" & ")}</span>
                        <input
                          type="number"
                          style={{ width: 60 }}
                          value={scoreValue(r.round, c.court, "b", c)}
                          onChange={(e) => setScore(r.round, c.court, "b", e.target.value)}
                        />
                      </div>
                      <button style={{ marginTop: 8 }} onClick={() => handleSave(r.round, c.court)} disabled={busy}>
                        {c.saved ? "Saved ✓ (save again to update)" : "Save result"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="vs-row">
                        <span className="team-name">{c.teamA.join(" & ")}</span>
                        <span>{c.saved ? c.scoreA : "—"}</span>
                      </div>
                      <div className="vs-row">
                        <span className="team-name">{c.teamB.join(" & ")}</span>
                        <span>{c.saved ? c.scoreB : "—"}</span>
                      </div>
                      {!c.saved && <p className="subtle" style={{ margin: 0 }}>Not yet played</p>}
                    </>
                  )}
                </div>
              ))}
              {r.sittingOut?.length > 0 && (
                <p className="subtle">Sitting out: {r.sittingOut.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
