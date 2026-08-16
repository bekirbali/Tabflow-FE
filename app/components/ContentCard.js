"use client";

import React, { useState } from "react";
import { 
  Play, Trash2, Heart, Bookmark, Check, RotateCcw, Plus, Clock, 
  BookOpen, Code, Star, GitFork, Globe, ExternalLink, Maximize2 
} from "lucide-react";
import { getYouTubeId } from "../utils/youtube";

export default function ContentCard({
  video, // This prop represents the link object (renamed to keep compatibility)
  activeTab,
  onLike,
  onBookmark,
  onDelete,
  onAction, // Mark as Read/Clean / Restore
  onFocusClick, // Callback to open Focus Mode modal
  isFocused // Keyboard navigation state
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Normalize properties for backward compatibility
  const id = video.id || video.videoId;
  const url = video.url || video.metadata?.url || "";
  const video_id = video.video_id || video.videoId || video.metadata?.video_id || getYouTubeId(url);
  const type = video_id ? "video" : (video.type || video.metadata?.type || "general");
  const title = video.title || video.metadata?.title || (video_id ? "YouTube Videosu" : "Başlıksız Link");
  const source_name = video.source_name || video.author_name || video.metadata?.source_name || (video_id ? "YouTube" : "Bilinmeyen Kaynak");
  const is_clean = video.is_clean !== undefined ? video.is_clean : video.is_watched;
  
  const metadata = video.metadata || {};
  const duration = (video.duration && video.duration !== "0:00") 
    ? video.duration 
    : (metadata.duration && metadata.duration !== "0:00") 
    ? metadata.duration 
    : null;

  const thumbnail_url = metadata.thumbnail_url || (video_id ? `https://img.youtube.com/vi/${video_id}/hqdefault.jpg` : null);
  const description = metadata.description || video.description || "";
  const read_time = metadata.read_time || video.read_time;
  const language = metadata.language || video.language;
  const stars = metadata.stars !== undefined ? metadata.stars : video.stars;

  // Format date in Turkish
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "şimdi";
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    if (isNaN(diffMs)) return "şimdi";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "şimdi";
    if (diffMins < 60) return `${diffMins} dk önce`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} saat önce`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} gün önce`;
  };

  const handleActionClick = (e) => {
    e.stopPropagation();
    setIsFadingOut(true);
    setTimeout(() => {
      onAction(video.id);
      setIsFadingOut(false);
    }, 400);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setIsFadingOut(true);
    setTimeout(() => {
      onDelete(video.id || video.videoId);
      setIsFadingOut(false);
    }, 400);
  };

  // Helper to open the focus modal
  const handleFocusClick = (e) => {
    e.stopPropagation();
    if (onFocusClick) {
      onFocusClick(video);
    }
  };

  // Helper to play video inline in feed
  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (type === "video" && video_id) {
      setIsPlaying(true);
    } else if (onFocusClick) {
      onFocusClick(video);
    }
  };

  return (
    <article
      className={`relative flex flex-col bg-zinc-900/80 border rounded-2xl md:rounded-3xl overflow-hidden shadow-xl transition-all duration-300 ease-out ${
        isFocused 
          ? "border-violet-500 shadow-2xl shadow-violet-500/20 ring-2 ring-violet-500/30 scale-[1.01] bg-zinc-900" 
          : "border-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-violet-950/20"
      } ${
        isFadingOut ? "opacity-0 scale-95 -translate-y-4" : "opacity-100 scale-100 translate-y-0"
      } group`}
    >
      {/* Top Header - Source & Date details */}
      <div className="flex items-center justify-between p-4 px-5 border-b border-white/5 bg-zinc-950/40">
        <div className="flex items-center gap-3">
          {/* Custom Avatar Icon based on type */}
          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white select-none shadow-lg shrink-0 ${
            type === "video" 
              ? "bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-500" 
              : type === "article"
              ? "bg-gradient-to-tr from-violet-600 to-cyan-500"
              : type === "code"
              ? "bg-gradient-to-tr from-zinc-800 to-zinc-600 border border-white/10"
              : "bg-gradient-to-tr from-teal-600 to-emerald-500"
          }`}>
            {type === "video" && <Play className="h-4 w-4 fill-white ml-0.5" />}
            {type === "article" && <BookOpen className="h-4 w-4" />}
            {type === "code" && <Code className="h-4 w-4" />}
            {type === "general" && <Globe className="h-4 w-4" />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-zinc-100 leading-tight">
              {source_name}
            </span>
            <span className="text-xs text-zinc-400 font-medium mt-0.5">
              {formatTimeAgo(video.created_at || video.addedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {type === "article" && read_time && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
              {read_time}
            </span>
          )}
          {type === "code" && language && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300">
              {language}
            </span>
          )}
          {type === "video" && duration && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-rose-400" />
              <span>{duration}</span>
            </span>
          )}
          <button
            onClick={handleDeleteClick}
            aria-label="Kalıcı Sil"
            className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all active:scale-90 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Media Thumbnail Section - Full Width Big Preview */}
      {(type === "video" || thumbnail_url) ? (
        <div className="relative w-full aspect-video bg-zinc-950 overflow-hidden border-b border-white/5">
          {type === "video" && video_id ? (
            isPlaying ? (
              <iframe
                src={`https://www.${activeTab === "private" ? "youtube-nocookie" : "youtube"}.com/embed/${video_id}?autoplay=1&rel=0`}
                title={title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div 
                onClick={handlePlayClick}
                className="relative w-full h-full cursor-pointer group/media"
              >
                <img
                  src={thumbnail_url || `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button 
                    onClick={handlePlayClick}
                    aria-label="Videoyu Akışta Oynat"
                    className="h-16 w-16 flex items-center justify-center rounded-full bg-zinc-950/75 border border-white/20 backdrop-blur-md shadow-2xl transition-all duration-300 group-hover/media:scale-110 group-hover/media:bg-violet-600 group-hover/media:border-violet-400 group-hover/media:shadow-violet-600/40 cursor-pointer"
                  >
                    <Play className="h-7 w-7 text-white fill-white ml-1" />
                  </button>
                </div>
                {duration && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/80 border border-white/10 backdrop-blur-md text-xs font-bold text-white shadow-lg pointer-events-none z-10">
                    <Clock className="h-3.5 w-3.5 text-rose-400" />
                    <span>{duration}</span>
                  </div>
                )}
              </div>
            )
          ) : (
            // Image preview for articles / general links
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block w-full h-full cursor-pointer"
            >
              <img
                src={thumbnail_url}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
            </a>
          )}
        </div>
      ) : (
        /* Styled fallback banner for link without thumbnail */
        <a 
          href={url}
          target="_blank" 
          rel="noopener noreferrer"
          className="relative w-full p-6 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-white/5 flex items-center gap-4 hover:bg-zinc-900/80 transition-colors"
        >
          <div className="h-12 w-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center shrink-0 text-violet-400">
            {type === "code" ? <Code className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
          </div>
          <div className="truncate flex-1">
            <span className="text-xs font-semibold text-zinc-500 block truncate">{url}</span>
            <span className="text-sm font-bold text-zinc-200 block truncate">{title}</span>
          </div>
        </a>
      )}

      {/* Card Info Section - Title & Description */}
      <div className="flex-1 flex flex-col p-5 sm:p-6 justify-between gap-3 bg-zinc-900/20">
        <div className="flex flex-col gap-2">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/title inline-block"
            >
              <h2 className="text-base sm:text-lg font-bold text-zinc-100 leading-snug tracking-tight group-hover/title:text-violet-300 transition-colors line-clamp-2">
                {title}
              </h2>
            </a>
          ) : (
            <h2 className="text-base sm:text-lg font-bold text-zinc-100 leading-snug tracking-tight line-clamp-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Extra info for GitHub / Code links */}
        {type === "code" && (stars !== undefined || video.metadata?.forks !== undefined) && (
          <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium pt-1">
            {stars !== undefined && (
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                <span>{stars.toLocaleString()} yıldız</span>
              </span>
            )}
            {video.metadata?.forks !== undefined && (
              <span className="flex items-center gap-1.5">
                <GitFork className="h-4 w-4 text-zinc-400" />
                <span>{video.metadata.forks.toLocaleString()} fork</span>
              </span>
            )}
          </div>
        )}

        {/* Fallback detail URL for general links */}
        {type === "general" && !thumbnail_url && url && (
          <div className="text-xs text-zinc-500 font-semibold truncate flex items-center gap-1.5 pt-1">
            <Globe className="h-3.5 w-3.5 text-zinc-500" />
            <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{url}</a>
          </div>
        )}
      </div>

      {/* Interaction Footer */}
      <div className="flex items-center justify-between p-3.5 px-5 border-t border-white/5 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(video.id);
            }}
            className={`p-2.5 rounded-xl transition-all duration-300 active:scale-90 cursor-pointer ${
              video.liked
                ? "text-rose-500 bg-rose-500/10 border border-rose-500/20"
                : "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent"
            }`}
          >
            <Heart className={`h-5 w-5 ${video.liked ? "fill-rose-500" : ""}`} />
          </button>

          {/* Bookmark Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(video.id);
            }}
            className={`p-2.5 rounded-xl transition-all duration-300 active:scale-90 cursor-pointer ${
              video.bookmarked
                ? "text-amber-500 bg-amber-500/10 border border-amber-500/20"
                : "text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent"
            }`}
          >
            <Bookmark className={`h-5 w-5 ${video.bookmarked ? "fill-amber-500" : ""}`} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleFocusClick}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-800/60 hover:bg-zinc-800 border border-white/10 transition-all active:scale-97 select-none cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5 text-zinc-400" />
            <span>Odak Modu</span>
          </button>

          {activeTab === "feed" && (
            <button
              onClick={handleActionClick}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-97 select-none cursor-pointer shadow-sm shadow-emerald-950/20"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>W - Tamamlandı</span>
            </button>
          )}

          {activeTab === "watched" && (
            <button
              onClick={handleActionClick}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all active:scale-97 select-none cursor-pointer shadow-sm shadow-violet-950/20"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Geri Al</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
