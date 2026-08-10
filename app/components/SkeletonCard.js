"use client";

/**
 * SkeletonCard — ContentCard'ın birebir yapısını taklit eden shimmer iskelet.
 * Header / Thumbnail / Body / Footer bölümleri gerçek kartla eşleşiyor.
 */
export default function SkeletonCard() {
  return (
    <article className="relative flex flex-col bg-zinc-900/80 border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl">

      {/* ── Top Header ── */}
      <div className="flex items-center justify-between p-4 px-5 border-b border-white/5 bg-zinc-950/40">
        <div className="flex items-center gap-3">
          {/* Avatar circle */}
          <div className="skeleton h-9 w-9 rounded-full shrink-0" />
          {/* Source name + date */}
          <div className="flex flex-col gap-1.5">
            <div className="skeleton h-3.5 w-24 rounded-md" />
            <div className="skeleton h-2.5 w-16 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Duration badge */}
          <div className="skeleton h-6 w-14 rounded-lg" />
          {/* Delete icon */}
          <div className="skeleton h-8 w-8 rounded-xl" />
        </div>
      </div>

      {/* ── Thumbnail — aspect-video (16:9) ── */}
      <div className="skeleton w-full aspect-video" style={{ borderRadius: 0 }} />

      {/* ── Content Body ── */}
      <div className="flex-1 flex flex-col p-5 sm:p-6 gap-3 bg-zinc-900/20">
        {/* Title lines */}
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-full rounded-md" />
          <div className="skeleton h-4 w-4/5 rounded-md" />
        </div>
        {/* Description lines */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="skeleton h-3 w-full rounded-md" />
          <div className="skeleton h-3 w-3/4 rounded-md" />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between p-3.5 px-5 border-t border-white/5 bg-zinc-950/40">
        {/* Like + Bookmark */}
        <div className="flex items-center gap-2">
          <div className="skeleton h-9 w-9 rounded-xl" />
          <div className="skeleton h-9 w-9 rounded-xl" />
        </div>
        {/* Odak Modu + Tamamlandı */}
        <div className="flex items-center gap-2.5">
          <div className="skeleton h-9 w-24 rounded-xl" />
          <div className="skeleton h-9 w-32 rounded-xl" />
        </div>
      </div>
    </article>
  );
}
