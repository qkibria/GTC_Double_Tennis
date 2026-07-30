"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const ALL_TABS = [
  { href: "/", label: "🎾 Generate" },
  { href: "/record/", label: "📝 Record" },
  { href: "/stats/", label: "🏆 Stats" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isAdmin, loading } = useAuth();

  // Default readonly users (not admin) should only see Record and Stats
  const TABS = loading
    ? []
    : isAdmin
    ? ALL_TABS
    : ALL_TABS.filter((t) => t.href !== "/");

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const isActive =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={isActive ? "active" : ""}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
