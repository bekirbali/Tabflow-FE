"use client";

/**
 * SkeletonCard — Video kartlarının yükleme placeholderı.
 * ContentCard'ın gerçek boyut ve yapısını taklit eden shimmer animasyonlu iskelet.
 */
export default function SkeletonCard() {
  return (
    <div className="relative rounded-2xl border border-white/5 bg-zinc-900/60 overflow-hidden p-4 flex gap-4">
      {/* Thumbnail skeleton */}
      <div className="skeleton flex-shrink-0 w-36 h-20 rounded-xl" />

      {/* Content skeleton */}
      <div className="flex-1 flex flex-col justify-between gap-2 py-0.5">
        {/* Title lines */}
        <div className="flex flex-col gap-2">
          <div className="skeleton h-3.5 w-full rounded-md" />
          <div className="skeleton h-3.5 w-4/5 rounded-md" />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1">
          <div className="skeleton h-3 w-16 rounded-md" />
          <div className="skeleton h-3 w-12 rounded-md" />
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2 mt-1">
          <div className="skeleton h-7 w-20 rounded-lg" />
          <div className="skeleton h-7 w-7 rounded-lg" />
          <div className="skeleton h-7 w-7 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
