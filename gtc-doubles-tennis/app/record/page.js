"use client";

import { useEffect, useState } from "react";
import {
  getWeeks,
  getCategories,
  getPlayers,
  saveCourtResult,
  saveWeek,
  deleteWeek,
  formatDateLong,
} from "../../lib/storage";
import { useAuth } from "../components/AuthProvider";

export default function RecordPage() {
  const { isAdmin, loading: authLoading } = useAuth();

  const [weeks, setWeeks] = useState([]);
  const [players, setPlayers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [draftWeek, setDraftWeek] = useState(null);
  const [scores, setScores] = useState({}); // key: "round-court" -> {a, b}
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [editingPairings, setEditingPairings] = useState(false);
  const [pairingSnapshot, setPairingSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);

  const activeWeek = weeks.find((w) => w.id === activeId) || null;
  const weekToShow = draftWeek || activeWeek;
  const categorySelectValue = categories.includes(selectedCategory) ? selectedCategory : "";

  useEffect(() => {
    (async () => {
      try {
        const [all, existingCategories, allPlayers] = await Promise.all([
          getWeeks(),
          getCategories(),
          getPlayers(),
        ]);
        setWeeks(all);
        setCategories(existingCategories);
        setPlayers(allPlayers);
        if (all.length > 0) setActiveId(all[0].id);
      } catch (err) {
        setLoadError("Couldn't load data — check your internet connection and try refreshing.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeWeek) {
      setSelectedCategory(activeWeek.category || "");
      setNewCategory("");
      setDraftWeek(JSON.parse(JSON.stringify(activeWeek)));
      setEditingPairings(false);
      setPairingSnapshot(null);
    } else {
      setDraftWeek(null);
    }
  }, [activeWeek?.id]);

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

  function updateCourtPlayer(round, court, team, slotIndex, value) {
    if (!draftWeek) return;
    setDraftWeek((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rounds: prev.rounds.map((r) => {
          if (r.round !== round) return r;
          return {
            ...r,
            courts: r.courts.map((c) => {
              if (c.court !== court) return c;
              const nextTeam = [...(team === "teamA" ? c.teamA : c.teamB)];
              nextTeam[slotIndex] = value;
              return {
                ...c,
                [team]: nextTeam,
                scoreA: "",
                scoreB: "",
                saved: false,
              };
            }),
          };
        }),
      };
    });
  }

  function weekPlayerPool() {
    if (!weekToShow) return [];
    return Array.from(
      new Set(
        weekToShow.rounds.flatMap((r) =>
          r.courts.flatMap((c) => [...c.teamA, ...c.teamB])
        )
      )
    );
  }

  function clearScores(rounds) {
    return rounds.map((r) => ({
      ...r,
      courts: r.courts.map((c) => ({
        ...c,
        scoreA: "",
        scoreB: "",
        saved: false,
      })),
    }));
  }

  async function handleSave(round, court) {
    const key = keyFor(round, court);
    const s = scores[key] || {};
    const roundObj = weekToShow.rounds.find((r) => r.round === round);
    const courtObj = roundObj.courts.find((c) => c.court === court);
    const scoreA = Number(s.a ?? courtObj.scoreA ?? 0);
    const scoreB = Number(s.b ?? courtObj.scoreB ?? 0);
    setBusy(true);
    try {
      await saveCourtResult(activeWeek.id, round, court, scoreA, scoreB, weekToShow.rounds);
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

  function startEditPairings() {
    setPairingSnapshot(draftWeek ? JSON.parse(JSON.stringify(draftWeek)) : null);
    setEditingPairings(true);
  }

  function cancelEditPairings() {
    if (pairingSnapshot) {
      setDraftWeek(pairingSnapshot);
    }
    setPairingSnapshot(null);
    setEditingPairings(false);
  }

  async function handleSaveWeek() {
    if (!draftWeek || !activeWeek) return;
    setBusy(true);
    try {
      const normalizedCategory = (newCategory || selectedCategory || "").trim() || "Uncategorized";
      const roundsToSave = editingPairings ? clearScores(draftWeek.rounds) : draftWeek.rounds;
      const saved = await saveWeek({
        id: activeWeek.id,
        date: draftWeek.date || activeWeek.date,
        numRounds: draftWeek.num_rounds ?? draftWeek.numRounds ?? 3,
        rounds: roundsToSave,
        category: normalizedCategory,
      });
      const refreshed = await getWeeks();
      setWeeks(refreshed);
      setCategories((prev) =>
        prev.includes(normalizedCategory) ? prev : [normalizedCategory, ...prev]
      );
      setSelectedCategory(saved.category || normalizedCategory);
      setNewCategory("");
      setActiveId(saved.id);
      setDraftWeek(JSON.parse(JSON.stringify(saved)));
      setEditingPairings(false);
      setPairingSnapshot(null);
      setScores({});
    } catch (err) {
      alert(err.message || "Couldn't save that week.");
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
                {w.category && <span className="pill" style={{ marginLeft: 8 }}>{w.category}</span>}
              </button>
            ))}
          </div>
      )}

      {activeWeek && (
        <div style={{ marginTop: 8 }}>
          <div className="list-row" style={{ borderBottom: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0 }}>{formatDateLong(activeWeek.date)}</h2>
              {activeWeek.category && <span className="pill">{activeWeek.category}</span>}
            </div>
            {isAdmin && (
              <button className="danger" onClick={() => removeWeek(activeWeek.id)} disabled={busy}>
                Delete week
              </button>
            )}
          </div>

          {isAdmin && (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <label className="subtle" style={{ display: "block", marginBottom: 4 }}>
                  Category
                </label>
                <select
                  value={categorySelectValue}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Select or enter a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="New category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{ marginTop: 4 }}
                />
                <div className="actions-row" style={{ marginTop: 8 }}>
                  <button onClick={handleSaveWeek} disabled={busy}>
                    Save pairing changes
                  </button>
                  {!editingPairings ? (
                    <button className="secondary" onClick={startEditPairings} disabled={busy}>
                      Edit pairings
                    </button>
                  ) : (
                    <button className="secondary" onClick={cancelEditPairings} disabled={busy}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {weekToShow.rounds.map((r) => (
            <div key={r.round}>
              <h2>Round {r.round}</h2>
              {r.courts.map((c) => (
                <div className="court-card" key={c.court}>
                  <h3>Court {c.court}</h3>
                  {isAdmin ? (
                    editingPairings ? (
                      <>
                        <div className="vs-row" style={{ alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            {c.teamA.map((player, idx) => (
                              <select
                                key={`teamA-${idx}`}
                                value={player}
                                onChange={(e) => updateCourtPlayer(r.round, c.court, "teamA", idx, e.target.value)}
                                style={{ marginBottom: 4, width: "100%" }}
                              >
                                {weekPlayerPool().map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            ))}
                          </div>
                          <div style={{ flex: 1 }}>
                            {c.teamB.map((player, idx) => (
                              <select
                                key={`teamB-${idx}`}
                                value={player}
                                onChange={(e) => updateCourtPlayer(r.round, c.court, "teamB", idx, e.target.value)}
                                style={{ marginBottom: 4, width: "100%" }}
                              >
                                {weekPlayerPool().map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            ))}
                          </div>
                        </div>
                        <p className="subtle" style={{ margin: "4px 0" }}>Editing pairings; save pairing changes.</p>
                      </>
                    ) : (
                      <>
                        <div className="vs-row">
                          <span className="team-name">{c.teamA.join(" & ")}</span>
                          <input
                            type="number"
                            style={{ width: 60, marginBottom: 0 }}
                            value={scoreValue(r.round, c.court, "a", c)}
                            onChange={(e) => setScore(r.round, c.court, "a", e.target.value)}
                          />
                        </div>
                        <div className="vs-row">
                          <span className="team-name">{c.teamB.join(" & ")}</span>
                          <input
                            type="number"
                            style={{ width: 60, marginBottom: 0 }}
                            value={scoreValue(r.round, c.court, "b", c)}
                            onChange={(e) => setScore(r.round, c.court, "b", e.target.value)}
                          />
                        </div>
                        <button style={{ marginTop: 8 }} onClick={() => handleSave(r.round, c.court)} disabled={busy}>
                          {c.saved ? "Saved ✓ (save again to update)" : "Save result"}
                        </button>
                      </>
                    )
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
