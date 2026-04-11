"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "search", label: "Otsi" },
  { href: "/categories", icon: "grid_view", label: "Kategooriad" },
  { href: "/info", icon: "info", label: "Info" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl rounded-t-2xl md:hidden">
      <div className="flex justify-around items-center px-6 pb-8 pt-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "flex flex-col items-center justify-center bg-primary-container text-on-primary rounded-xl p-3"
                  : "flex flex-col items-center justify-center text-outline p-3"
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider mt-1">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
