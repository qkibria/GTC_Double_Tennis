"use client";

import { useEffect, useState } from "react";
import { computeStats, getCategories } from "../../lib/storage";

export default function StatsPage() {
  const [stats, setStats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setCategories(await getCategories());
      } catch (err) {
        setLoadError("Couldn't load data — check your internet connection and try refreshing.");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setStats(
          await computeStats(selectedCategory === "all" ? null : selectedCategory)
        );
      } catch (err) {
        setLoadError("Couldn't load data — check your internet connection and try refreshing.");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCategory]);

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
      <label className="subtle" style={{ display: "block", marginBottom: 8 }}>
        Category
      </label>
      <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
        <option value="all">All categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
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
