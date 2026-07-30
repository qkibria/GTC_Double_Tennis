"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const TABS = [
  { href: "/", label: "🎾 Generate" },
  { href: "/record/", label: "📝 Record" },
  { href: "/stats/", label: "🏆 Stats" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isAdmin, loading } = useAuth();
  const visibleTabs = loading || isAdmin ? TABS : TABS.filter((tab) => tab.href !== "/");

  return (
    <nav className="bottom-nav">
      {visibleTabs.map((tab) => {
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
