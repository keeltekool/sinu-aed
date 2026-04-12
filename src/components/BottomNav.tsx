"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "search", label: "Otsi" },
  { href: "/search?q=muld", icon: "potted_plant", label: "Mullad" },
  { href: "/search?q=väetis", icon: "grass", label: "Väetised" },
  { href: "/search?q=värv", icon: "format_paint", label: "Värvid" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl rounded-t-2xl">
      <div className="flex justify-around items-center px-4 pb-6 pt-3 max-w-2xl mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith("/search") && item.href.includes(new URLSearchParams(item.href.split("?")[1]).get("q") || "___"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "flex flex-col items-center justify-center bg-primary-container text-on-primary rounded-xl p-2.5"
                  : "flex flex-col items-center justify-center text-outline p-2.5 hover:text-primary transition-colors"
              }
            >
              <span className="material-symbols-outlined text-xl">
                {item.icon}
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wider mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
