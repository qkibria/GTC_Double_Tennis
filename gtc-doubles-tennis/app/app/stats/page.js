"use client";

import { useEffect, useState } from "react";
import { computeStats } from "../../lib/storage";

export default function StatsPage() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setStats(await computeStats());
      } catch (err) {
        setLoadError("Couldn't load data — check your internet connection and try refreshing.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="subtle">Loading&hellip;</p>;

  if (loadError) {
    return (
      <div>
        <h1>Stats</h1>
        <p style={{ color: "#f87171" }}>{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Stats</h1>
      {stats.length === 0 && (
        <p className="subtle">No players yet &mdash; add some in the Generate tab.</p>
      )}
      {stats.length > 0 && (
        <div className="stats-table">
          <div className="stats-row stats-header">
            <span>Player</span>
            <span>Sets played</span>
            <span>Sets won</span>
            <span>Win %</span>
          </div>
          {stats.map((s) => (
            <div key={s.name} className="stats-row">
              <span>{s.name}</span>
              <span>{s.played}</span>
              <span>{s.won}</span>
              <span>{s.winPct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
