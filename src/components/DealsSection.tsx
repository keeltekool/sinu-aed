"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { DealsResponse } from "../lib/types";
import DealCard from "./DealCard";

export default function DealsSection() {
  const [data, setData] = useState<DealsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    fetch("/api/deals")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((json: DealsResponse) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [data, loading, checkScroll]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  // Hide section entirely if no deals or error
  if (!loading && (!data || data.deals.length === 0)) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="headline font-semibold text-xl text-primary">
          Praegu soodsalt
        </h3>
        {data && (
          <span className="text-xs text-outline bg-surface-container-low px-2 py-0.5 rounded-full">
            {data.deals.length}
          </span>
        )}
      </div>

      <div className="relative group">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-surface/90 rounded-full items-center justify-center shadow-md hover:bg-surface-container-low transition-colors"
            aria-label="Keri vasakule"
          >
            <span className="material-symbols-outlined text-on-surface">
              chevron_left
            </span>
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-surface/90 rounded-full items-center justify-center shadow-md hover:bg-surface-container-low transition-colors"
            aria-label="Keri paremale"
          >
            <span className="material-symbols-outlined text-on-surface">
              chevron_right
            </span>
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 no-scrollbar pb-2 -mx-6 px-6"
        >
          {loading
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-none w-64 bg-surface-container-lowest rounded-lg overflow-hidden animate-pulse"
                >
                  <div className="h-36 bg-surface-container-high" />
                  <div className="p-4 space-y-3">
                    <div className="h-2 bg-surface-container-high rounded w-1/3" />
                    <div className="h-4 bg-surface-container-high rounded w-2/3" />
                    <div className="h-5 bg-surface-container-high rounded w-1/2" />
                  </div>
                </div>
              ))
            : data?.deals.map((deal, i) => (
                <DealCard key={`${deal.chain}-${deal.brand}-${deal.size}-${i}`} deal={deal} />
              ))}
        </div>
      </div>
    </section>
  );
}
