"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPlayers,
  addPlayer,
  updatePlayer,
  deletePlayer,
  getWeeks,
  saveWeek,
  findWeekByDate,
  getDefaultMatchDate,
  getCategories,
  formatDateLong,
} from "../lib/storage";
import { generateRounds } from "../lib/pairing";
import { useAuth } from "./components/AuthProvider";

export default function GeneratePage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [latestWeek, setLatestWeek] = useState(null);

  const [selected, setSelected] = useState(new Set());
  const [newName, setNewName] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [matchDate, setMatchDate] = useState("");
  const [numRounds, setNumRounds] = useState(3);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingPairings, setEditingPairings] = useState(false);
  const [pairingSnapshot, setPairingSnapshot] = useState(null);
  const [pairingMsg, setPairingMsg] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/record");
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    (async () => {
      try {
        const [allPlayers, weeks, existingCategories] = await Promise.all([
          getPlayers(),
          getWeeks(),
          getCategories(),
        ]);
        setPlayers(allPlayers);
        setLatestWeek(weeks[0] || null);
        setCategories(existingCategories);
      } catch (err) {
        setLoadError("Couldn't load data — check your internet connection and try refreshing.");
      } finally {
        setMatchDate(getDefaultMatchDate());
        setLoading(false);
      }
    })();
  }, []);

  function toggle(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function handleAddPlayer() {
    if (!newName.trim()) return;
    setErrorMsg("");
    setBusy(true);
    try {
      const updated = await addPlayer(newName, newRating);
      setPlayers(updated);
      setNewName("");
      setNewRating(5);
    } catch (err) {
      setErrorMsg(err.message || "Couldn't add that player.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditRating(p.rating);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id) {
    if (!editName.trim()) return;
    setBusy(true);
    try {
      const updated = await updatePlayer(id, { name: editName, rating: editRating });
      setPlayers(updated);
      setEditingId(null);
    } catch (err) {
      setErrorMsg(err.message || "Couldn't save that change.");
    } finally {
      setBusy(false);
    }
  }

  async function removePlayer(id) {
    if (!confirm("Delete this player completely? This can't be undone.")) return;
    setBusy(true);
    try {
      const updated = await deletePlayer(id);
      setPlayers(updated);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setEditingId(null);
    } catch (err) {
      setErrorMsg(err.message || "Couldn't delete that player.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    setErrorMsg("");
    setEditingPairings(false);
    setPairingMsg("");
    const chosen = players.filter((p) => selected.has(p.id));
    if (chosen.length < 4) {
      setErrorMsg("Pick at least 4 players (need a full court).");
      return;
    }
    if (!matchDate) {
      setErrorMsg("Pick a match date.");
      return;
    }
    const rounds = Number(numRounds) || 3;
    const outcome = generateRounds(chosen, rounds);
    if (outcome.error) {
      setErrorMsg(outcome.error);
      return;
    }

    setBusy(true);
    try {
      const existing = await findWeekByDate(matchDate);
      if (
        existing &&
        !confirm(`Matches already exist for ${formatDateLong(matchDate)}. Overwrite them?`)
      ) {
        setBusy(false);
        return;
      }

      const roundsWithScores = outcome.rounds.map((r) => ({
        ...r,
        courts: r.courts.map((c) => ({ ...c, scoreA: "", scoreB: "", saved: false })),
      }));

      const saved = await saveWeek({
        id: existing?.id,
        date: matchDate,
        numRounds: rounds,
        rounds: roundsWithScores,
        category,
      });

      const normalizedCategory = category.trim() || "Uncategorized";
      setCategory(normalizedCategory);
      setCategories((prev) =>
        prev.includes(normalizedCategory) ? prev : [normalizedCategory, ...prev]
      );
      setResult({ ...outcome, rounds: roundsWithScores, category: normalizedCategory });
      setLatestWeek(saved);
    } catch (err) {
      setErrorMsg(err.message || "Couldn't save the generated matches.");
    } finally {
      setBusy(false);
    }
  }

  // ---------- Manual pairing edits ----------

  function startEditPairings() {
    setPairingSnapshot(JSON.parse(JSON.stringify(result)));
    setPairingMsg("");
    setEditingPairings(true);
  }

  function cancelEditPairings() {
    setResult(pairingSnapshot);
    setPairingSnapshot(null);
    setEditingPairings(false);
    setPairingMsg("");
  }

  function poolNames() {
    return players.filter((p) => selected.has(p.id)).map((p) => p.name);
  }

  function updateSlot(roundNumber, courtNumber, team, slotIndex, newName) {
    setResult((prev) => {
      const rounds = prev.rounds.map((r) => {
        if (r.round !== roundNumber) return r;
        const courts = r.courts.map((c) => {
          if (c.court !== courtNumber) return c;
          const updatedCourt = { ...c, teamA: [...c.teamA], teamB: [...c.teamB] };
          updatedCourt[team][slotIndex] = newName;
          return updatedCourt;
        });
        const playingNow = new Set();
        courts.forEach((c) => {
          c.teamA.forEach((nm) => playingNow.add(nm));
          c.teamB.forEach((nm) => playingNow.add(nm));
        });
        const sittingOut = poolNames().filter((nm) => !playingNow.has(nm));
        return { ...r, courts, sittingOut };
      });
      return { ...prev, rounds };
    });
  }

  async function savePairingChanges() {
    for (const r of result.rounds) {
      const seen = new Set();
      let duplicate = null;
      r.courts.forEach((c) => {
        [...c.teamA, ...c.teamB].forEach((nm) => {
          if (seen.has(nm)) duplicate = nm;
          seen.add(nm);
        });
      });
      if (duplicate) {
        setPairingMsg(
          `${duplicate} is on two courts in Round ${r.round} — fix that before saving.`
        );
        return;
      }
    }
    setPairingMsg("");
    setBusy(true);
    try {
      const existing = await findWeekByDate(matchDate);
      const saved = await saveWeek({
        id: existing?.id,
        date: matchDate,
        numRounds: Number(numRounds) || 3,
        rounds: result.rounds,
        category: result.category || category || "Uncategorized",
      });
      setLatestWeek(saved);
      setEditingPairings(false);
      setPairingSnapshot(null);
    } catch (err) {
      setPairingMsg(err.message || "Couldn't save your changes.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading) return <p className="subtle">Loading&hellip;</p>;

  if (!authLoading && !isAdmin) {
    return null;
  }

  if (loadError) {
    return (
      <div>
        <h1>Generate Matches</h1>
        <p style={{ color: "#f87171" }}>{loadError}</p>
      </div>
    );
  }

  // ---------- Read-only view for everyone who isn't logged in as admin ----------

  if (!isAdmin) {
    return (
      <div>
        <h1>Generate Matches</h1>
        <p className="subtle">
          Viewing only — <a href="/admin" style={{ color: "#d7c9e0" }}>log in as admin</a> to
          add players or generate new matches.
        </p>

        <h2>Players</h2>
        <div className="player-grid">
          {players.map((p) => (
            <div className="player-card" key={p.id} style={{ cursor: "default" }}>
              <span className="player-name">{p.name}</span>
              <span className="pill">rating {p.rating}</span>
            </div>
          ))}
          {players.length === 0 && <p className="subtle">No players yet.</p>}
        </div>

        {latestWeek ? (
          <div style={{ marginTop: 8 }}>
            <h2>Latest matches &mdash; {formatDateLong(latestWeek.date)}</h2>
            {latestWeek.rounds.map((r) => (
              <div key={r.round}>
                <h2>Round {r.round}</h2>
                {r.courts.map((c) => (
                  <div className="court-card" key={c.court}>
                    <h3>Court {c.court}</h3>
                    <div className="vs-row">
                      <span className="team-name">{c.teamA.join(" & ")}</span>
                      <span>vs</span>
                      <span className="team-name">{c.teamB.join(" & ")}</span>
                    </div>
                  </div>
                ))}
                {r.sittingOut?.length > 0 && (
                  <p className="subtle">Sitting out: {r.sittingOut.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="subtle" style={{ marginTop: 16 }}>No matches generated yet.</p>
        )}
      </div>
    );
  }

  // ---------- Full admin view ----------

  return (
    <div>
      <h1>Generate Matches</h1>
      <p className="subtle">Add players, pick who's playing, then generate the draw.</p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add a player</h2>
        <label className="subtle" style={{ display: "block", marginBottom: 4 }}>
          Category
        </label>
        <input
          list="category-options"
          placeholder="Thursday Practice"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="category-options">
          {categories.map((existingCategory) => (
            <option key={existingCategory} value={existingCategory} />
          ))}
        </datalist>
        <input
          type="text"
          placeholder="Player name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <label className="subtle" style={{ display: "block", marginBottom: 4 }}>
          Rating (1 weakest &ndash; 10 strongest)
        </label>
        <input
          type="number"
          min={1}
          max={10}
          value={newRating}
          onChange={(e) => setNewRating(e.target.value)}
        />
        <button onClick={handleAddPlayer} disabled={busy}>Save player</button>
      </div>

      <h2>Players ({selected.size} selected this week)</h2>
      <div className="player-grid">
        {players.map((p) => {
          const isEditing = editingId === p.id;
          const isSelected = selected.has(p.id);

          if (isEditing) {
            return (
              <div className="player-card editing" key={p.id}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={editRating}
                  onChange={(e) => setEditRating(e.target.value)}
                />
                <div className="card-btn-row">
                  <button onClick={() => saveEdit(p.id)} disabled={busy}>Save</button>
                  <button className="secondary" onClick={cancelEdit}>Cancel</button>
                </div>
                <button
                  className="danger"
                  style={{ width: "100%", marginTop: 6 }}
                  onClick={() => removePlayer(p.id)}
                  disabled={busy}
                >
                  Delete player
                </button>
              </div>
            );
          }

          return (
            <div
              className={`player-card${isSelected ? " selected" : ""}`}
              key={p.id}
              onClick={() => toggle(p.id)}
            >
              <span className="player-name">{p.name}</span>
              <span className="pill">rating {p.rating}</span>
              <button
                className="edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(p);
                }}
              >
                Edit
              </button>
            </div>
          );
        })}
        {players.length === 0 && (
          <p className="subtle">No players yet &mdash; add one above.</p>
        )}
      </div>

      <h2>Match details</h2>
      <div className="card">
        <label className="subtle" style={{ display: "block" }}>Match date</label>
        <input
          type="date"
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
        />
        <label className="subtle" style={{ display: "block", marginTop: 10 }}>
          Number of rounds
        </label>
        <select value={numRounds} onChange={(e) => setNumRounds(e.target.value)}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <button style={{ marginTop: 4 }} onClick={handleGenerate} disabled={busy}>
        Generate {numRounds} Round{Number(numRounds) === 1 ? "" : "s"}
      </button>
      {errorMsg && <p style={{ color: "#f87171" }}>{errorMsg}</p>}

      {result && (
        <div style={{ marginTop: 24 }}>
          <p className="subtle">
            {formatDateLong(matchDate)} &middot; {result.courtsCount} court
            {result.courtsCount > 1 ? "s" : ""} per round
            {result.sitOutCount > 0 ? ` · ${result.sitOutCount} sitting out each round` : ""}
          </p>

          <div className="actions-row">
            {!editingPairings ? (
              <button className="secondary" onClick={startEditPairings}>
                Edit pairings
              </button>
            ) : (
              <>
                <button onClick={savePairingChanges} disabled={busy}>Save pairing changes</button>
                <button className="secondary" onClick={cancelEditPairings}>
                  Cancel
                </button>
              </>
            )}
          </div>
          {pairingMsg && <p style={{ color: "#f87171" }}>{pairingMsg}</p>}

          {result.rounds.map((r) => {
            const isFinalRound = r.round === result.rounds.length;
            return (
              <div key={r.round}>
                <h2>
                  Round {r.round}
                  {isFinalRound && <span className="pill" style={{ marginLeft: 6 }}>strong round</span>}
                </h2>
                {r.courts.map((c) => (
                  <div className="court-card" key={c.court}>
                    <h3>Court {c.court}</h3>
                    {editingPairings ? (
                      <>
                        <div className="vs-row">
                          <select
                            value={c.teamA[0]}
                            onChange={(e) => updateSlot(r.round, c.court, "teamA", 0, e.target.value)}
                          >
                            {poolNames().map((nm) => (
                              <option key={nm} value={nm}>{nm}</option>
                            ))}
                          </select>
                          <select
                            value={c.teamA[1]}
                            onChange={(e) => updateSlot(r.round, c.court, "teamA", 1, e.target.value)}
                          >
                            {poolNames().map((nm) => (
                              <option key={nm} value={nm}>{nm}</option>
                            ))}
                          </select>
                        </div>
                        <p className="subtle" style={{ margin: "2px 0" }}>vs</p>
                        <div className="vs-row">
                          <select
                            value={c.teamB[0]}
                            onChange={(e) => updateSlot(r.round, c.court, "teamB", 0, e.target.value)}
                          >
                            {poolNames().map((nm) => (
                              <option key={nm} value={nm}>{nm}</option>
                            ))}
                          </select>
                          <select
                            value={c.teamB[1]}
                            onChange={(e) => updateSlot(r.round, c.court, "teamB", 1, e.target.value)}
                          >
                            {poolNames().map((nm) => (
                              <option key={nm} value={nm}>{nm}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="vs-row">
                        <span className="team-name">{c.teamA.join(" & ")}</span>
                        <span>vs</span>
                        <span className="team-name">{c.teamB.join(" & ")}</span>
                      </div>
                    )}
                  </div>
                ))}
                {r.sittingOut.length > 0 && (
                  <p className="subtle">Sitting out: {r.sittingOut.join(", ")}</p>
                )}
              </div>
            );
          })}
          <p className="subtle" style={{ marginTop: 8 }}>
            Saved under {formatDateLong(matchDate)} &mdash; head to the Record tab to log scores.
          </p>
        </div>
      )}
    </div>
  );
}
