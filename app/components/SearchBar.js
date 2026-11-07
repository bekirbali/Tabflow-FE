"use client";

import React, { useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";

export default function SearchBar({
  query,
  onQueryChange,
  onClear,
  isLoading = false,
  totalResults = null,
  isSearchActive = false,
}) {
  const inputRef = useRef(null);

  // Global Ctrl+K / Cmd+K kısayolu ile arama kutusuna odaklanma
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Eğer kullanıcı başka bir input veya textarea içindeyse kısayolu engelle
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleInputKeyDown = (e) => {
    if (e.key === "Escape") {
      onClear();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        className={`relative flex items-center w-full rounded-2xl border transition-all duration-300 bg-zinc-900/60 backdrop-blur-xl ${
          isSearchActive
            ? "border-violet-500/50 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        <div className="flex items-center justify-center pl-4 pr-2 text-zinc-400 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
          ) : (
            <Search className="h-4 w-4 text-zinc-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Videolarda ara... (başlık, kanal, link veya video ID)"
          className="w-full bg-transparent py-3 pr-20 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
        />

        <div className="absolute right-3 flex items-center gap-2">
          {query ? (
            <button
              onClick={() => {
                onClear();
                inputRef.current?.focus();
              }}
              title="Aramayı temizle (Esc)"
              className="flex items-center justify-center h-6 w-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/5 text-[10px] font-mono text-zinc-400 select-none pointer-events-none">
              <span>Ctrl+K</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

