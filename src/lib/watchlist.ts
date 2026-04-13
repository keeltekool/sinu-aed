"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sinu-aed-watchlist";
const MAX_ITEMS = 30;

export interface WatchlistItem {
  matchKey: string;
  name: string;
  addedAt: string;
}

function readWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWatchlist(items: WatchlistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Dispatch storage event so other components update
    window.dispatchEvent(new Event("watchlist-changed"));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  // Load on mount + listen for changes from other components
  useEffect(() => {
    setWatchlist(readWatchlist());

    const onUpdate = () => setWatchlist(readWatchlist());
    window.addEventListener("watchlist-changed", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("watchlist-changed", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const add = useCallback((matchKey: string, name: string) => {
    const current = readWatchlist();
    if (current.find((item) => item.matchKey === matchKey)) return;
    const updated = [
      { matchKey, name, addedAt: new Date().toISOString() },
      ...current,
    ].slice(0, MAX_ITEMS);
    writeWatchlist(updated);
    setWatchlist(updated);
  }, []);

  const remove = useCallback((matchKey: string) => {
    const current = readWatchlist();
    const updated = current.filter((item) => item.matchKey !== matchKey);
    writeWatchlist(updated);
    setWatchlist(updated);
  }, []);

  const isWatched = useCallback(
    (matchKey: string) => watchlist.some((item) => item.matchKey === matchKey),
    [watchlist]
  );

  return {
    watchlist,
    count: watchlist.length,
    add,
    remove,
    isWatched,
  };
}
