"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "🎾 Generate" },
  { href: "/record/", label: "📝 Record" },
  { href: "/stats/", label: "🏆 Stats" },
];

export default function BottomNav() {
  const pathname = usePathname();

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
