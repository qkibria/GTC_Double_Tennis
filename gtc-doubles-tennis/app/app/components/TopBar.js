"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function TopBar() {
  const { isAdmin, loading, signOut } = useAuth();

  return (
    <header className="top-bar">
      <Link href="/" className="top-bar-brand">
        <img src="/gtc-logo.jpg" alt="Greenford Tennis Club logo" className="brand-logo" />
        <div>
          <div className="brand-title">Greenford Tennis Club</div>
          <div className="brand-subtitle">(GTC) Doubles Tennis</div>
        </div>
      </Link>
      <div className="top-bar-admin">
        {!loading &&
          (isAdmin ? (
            <button className="secondary" onClick={signOut}>
              Log out
            </button>
          ) : (
            <Link href="/admin" className="admin-link">
              Admin login
            </Link>
          ))}
      </div>
    </header>
  );
}
