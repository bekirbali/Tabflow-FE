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
  const url = video.url;
  const video_id = video.video_id || video.videoId || getYouTubeId(url);
  const type = video_id ? "video" : (video.type || "general");
  const title = video.title || "Başlıksız Link";
  const source_name = video.source_name || video.author_name || "Bilinmeyen Kaynak";
  const is_clean = video.is_clean !== undefined ? video.is_clean : video.is_watched;
  const duration = video.duration || "0:00";
  const metadata = video.metadata || {};
  const thumbnail_url = metadata.thumbnail_url;
  const description = metadata.description;
  const read_time = metadata.read_time;
  const language = metadata.language;
  const stars = metadata.stars;

  // Format date in Turkish
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "şimdi";
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
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
  const handleCardClick = () => {
    if (onFocusClick) {
      onFocusClick(video);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={`relative flex flex-col bg-zinc-900/60 border rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ease-out cursor-pointer ${
        isFocused 
          ? "border-violet-500 shadow-xl shadow-violet-500/10 ring-2 ring-violet-500/20 scale-[1.015] bg-zinc-900/90" 
          : "border-white/5 hover:border-white/15 hover:shadow-2xl hover:shadow-violet-950/10"
      } ${
        isFadingOut ? "opacity-0 scale-95 -translate-y-4" : "opacity-100 scale-100 translate-y-0"
      } group`}
    >
      {/* Top Header - Source & Date details */}
      <div className="flex items-center justify-between p-4 sm:p-4 border-b border-white/5 bg-zinc-950/20">
        <div className="flex items-center gap-3">
          {/* Custom Avatar Icon based on type */}
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white select-none shadow-md ${
            type === "video" 
              ? "bg-gradient-to-tr from-rose-600 to-amber-500" 
              : type === "article"
              ? "bg-gradient-to-tr from-violet-600 to-cyan-500"
              : type === "code"
              ? "bg-gradient-to-tr from-zinc-800 to-zinc-600 border border-white/10"
              : "bg-gradient-to-tr from-teal-600 to-emerald-500"
          }`}>
            {type === "video" && <Play className="h-3.5 w-3.5 fill-white" />}
            {type === "article" && <BookOpen className="h-3.5 w-3.5" />}
            {type === "code" && <Code className="h-3.5 w-3.5" />}
            {type === "general" && <Globe className="h-3.5 w-3.5" />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-200">
              {source_name}
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              {formatTimeAgo(video.created_at || video.addedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {type === "article" && read_time && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">
              {read_time}
            </span>
          )}
          {type === "code" && language && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 border border-white/5 text-zinc-300">
              {language}
            </span>
          )}
          {type === "video" && duration && duration !== "0:00" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1">
              <Clock className="h-3 w-3 text-rose-400" />
              <span>{duration}</span>
            </span>
          )}
          <button
            onClick={handleDeleteClick}
            aria-label="Kalıcı Sil"
            className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all active:scale-90"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row flex-1">
        {/* Render media thumbnail if type is video or if it has a thumbnail image */}
        {(type === "video" || thumbnail_url) && (
          <div className={`relative bg-zinc-950 overflow-hidden shrink-0 ${
            type === "video" ? "aspect-video w-full" : "aspect-video w-full md:aspect-square md:w-32"
          }`}>
            {type === "video" && video_id ? (
              <>
                <img
                  src={thumbnail_url || `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-12 w-12 flex items-center justify-center rounded-full bg-zinc-950/80 border border-white/20 backdrop-blur-md shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-violet-600 group-hover:border-violet-400">
                    <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                  </div>
                </div>
                {duration && duration !== "0:00" && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-950/80 border border-white/10 backdrop-blur-sm text-[9px] font-bold text-white">
                    <Clock className="h-2.5 w-2.5 text-zinc-400" />
                    <span>{duration}</span>
                  </div>
                )}
              </>
            ) : (
              // Image preview for articles / general links
              <img
                src={thumbnail_url}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            )}
          </div>
        )}

        {/* Text Details */}
        <div className="flex-1 flex flex-col p-4 sm:p-5 justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-bold text-zinc-100 line-clamp-2 leading-snug tracking-tight group-hover:text-white transition-colors">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Repo statistics for GitHub */}
          {type === "code" && (stars !== undefined || video.metadata?.forks !== undefined) && (
            <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500 font-medium">
              {stars !== undefined && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                  <span>{stars.toLocaleString()} yıldız</span>
                </span>
              )}
              {video.metadata?.forks !== undefined && (
                <span className="flex items-center gap-1">
                  <GitFork className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{video.metadata.forks.toLocaleString()} fork</span>
                </span>
              )}
            </div>
          )}

          {/* Fallback details for general links */}
          {type === "general" && (
            <div className="text-xs text-zinc-500 font-semibold truncate mt-3 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              <span>{url}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interaction Footer */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-t border-white/5 bg-zinc-950/20">
        <div className="flex items-center gap-2">
          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(video.id);
            }}
            className={`p-2 rounded-xl transition-all duration-300 active:scale-90 ${
              video.liked
                ? "text-rose-500 bg-rose-500/10"
                : "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5"
            }`}
          >
            <Heart className={`h-4.5 w-4.5 ${video.liked ? "fill-rose-500" : ""}`} />
          </button>

          {/* Bookmark Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(video.id);
            }}
            className={`p-2 rounded-xl transition-all duration-300 active:scale-90 ${
              video.bookmarked
                ? "text-amber-500 bg-amber-500/10"
                : "text-zinc-500 hover:text-amber-400 hover:bg-amber-500/5"
            }`}
          >
            <Bookmark className={`h-4.5 w-4.5 ${video.bookmarked ? "fill-amber-500" : ""}`} />
          </button>
        </div>

        {/* Dynamic Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-zinc-400 bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 transition-all select-none"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Odak Modu</span>
          </button>

          {activeTab === "feed" && (
            <button
              onClick={handleActionClick}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-97 select-none"
            >
              <Check className="h-3.5 w-3.5" />
              <span>W - Tamamlandı</span>
            </button>
          )}

          {activeTab === "watched" && (
            <button
              onClick={handleActionClick}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all active:scale-97 select-none"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Geri Al</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
