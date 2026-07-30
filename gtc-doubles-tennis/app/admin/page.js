"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

export default function AdminPage() {
  const { isAdmin, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email, password);
      router.push("/");
    } catch (err) {
      setError("Login failed — check the email and password and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="subtle">Loading&hellip;</p>;

  if (isAdmin) {
    return (
      <div>
        <h1>Admin</h1>
        <p className="subtle">
          You're logged in as admin. You can now add players, generate
          matches, edit pairings, and enter results on the Generate and
          Record tabs.
        </p>
        <button className="danger" onClick={signOut}>Log out</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Admin login</h1>
      <p className="subtle">
        Everyone can view players, matches, and stats without logging in.
        Log in here to add players, generate matches, edit pairings, and
        enter results.
      </p>
      <form onSubmit={handleSubmit}>
        <label className="subtle" style={{ display: "block" }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="subtle" style={{ display: "block" }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
    </div>
  );
}
