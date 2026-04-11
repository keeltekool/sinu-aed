"use client";

import Link from "next/link";
import { CATEGORIES } from "../lib/constants";

export default function CategoryGrid() {
  return (
    <section className="space-y-4">
      <h3 className="headline font-semibold text-xl text-primary">
        Kategooriad
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            href={`/search?q=${encodeURIComponent(cat.searchQuery)}`}
            className="group cursor-pointer bg-surface-container-low p-5 rounded-lg hover:bg-primary-container hover:text-on-primary transition-all duration-300 flex flex-col items-center justify-center text-center gap-2"
          >
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">
              {cat.icon}
            </span>
            <span className="font-semibold text-sm">{cat.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
