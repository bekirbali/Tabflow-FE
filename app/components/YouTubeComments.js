"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, ThumbsUp, AlertCircle, 
  MessageSquareOff, RefreshCw, Sparkles, User, ExternalLink 
} from "lucide-react";

// Format relative date into Turkish
function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;
  const years = Math.floor(months / 12);
  return `${years} yıl önce`;
}

// Format numbers (e.g. 1540 -> 1.5B or 1.5K)
function formatCompactNumber(num) {
  if (!num || num === 0) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "B";
  return num.toString();
}

export default function YouTubeComments({ videoId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disabled, setDisabled] = useState(false);

  const fetchComments = async () => {
    if (!videoId) return;
    setLoading(true);
    setError(null);
    setDisabled(false);

    try {
      const res = await fetch(`/api/youtube/comments?videoId=${encodeURIComponent(videoId)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Yorumlar alınamadı.");
      }

      if (data.disabled) {
        setDisabled(true);
        setComments([]);
      } else {
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Comments fetch error:", err);
      setError(err.message || "Yorumlar yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [videoId]);

  return (
    <div className="flex flex-col h-full bg-zinc-950/60 border-t lg:border-t-0 lg:border-l border-white/10 overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-zinc-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Öne Çıkan Yorumlar
              {!loading && !disabled && comments.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {comments.length}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-zinc-400">YouTube topluluk tartışmaları</p>
          </div>
        </div>

        <button
          onClick={fetchComments}
          disabled={loading}
          title="Yorumları Yenile"
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-violet-400" : ""}`} />
        </button>
      </div>

      {/* Panel Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
        {/* Loading State */}
        {loading && (
          <div className="space-y-4 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-zinc-900/30 border border-white/5 animate-pulse space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-zinc-800 rounded w-1/3" />
                    <div className="h-2 bg-zinc-850 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-3 bg-zinc-800/60 rounded w-full" />
                <div className="h-3 bg-zinc-800/60 rounded w-4/5" />
              </div>
            ))}
          </div>
        )}

        {/* Disabled Comments State */}
        {!loading && disabled && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto text-zinc-400 space-y-3">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 text-zinc-500">
              <MessageSquareOff className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">Yorumlar Kapatılmış</p>
              <p className="text-xs text-zinc-500 mt-1">Bu video için yorumlar içerik üreticisi tarafından devre dışı bırakılmış.</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && !disabled && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Yorumlar Yüklenemedi</span>
            </div>
            <p className="text-rose-300/80">{error}</p>
            <button
              onClick={fetchComments}
              className="mt-2 text-[11px] font-bold text-white bg-rose-600/40 hover:bg-rose-600/60 px-3 py-1.5 rounded-lg border border-rose-500/30 transition-all"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Empty Comments State */}
        {!loading && !error && !disabled && comments.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto text-zinc-400 space-y-3">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 text-zinc-500">
              <Sparkles className="h-8 w-8 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">Henüz Yorum Bulunamadı</p>
              <p className="text-xs text-zinc-500 mt-1">Bu video için öne çıkan herhangi bir yorum bulunmuyor.</p>
            </div>
          </div>
        )}

        {/* Comments List */}
        {!loading && !error && !disabled && comments.map((comment) => (
          <div
            key={comment.id}
            className="group p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/70 border border-white/5 hover:border-white/10 transition-all duration-200"
          >
            {/* Header / Author */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {comment.authorProfileImageUrl ? (
                  <img
                    src={comment.authorProfileImageUrl}
                    alt={comment.authorDisplayName}
                    className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="w-7 h-7 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/20 flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ display: comment.authorProfileImageUrl ? "none" : "flex" }}
                >
                  <User className="h-3.5 w-3.5" />
                </div>
                
                <div className="min-w-0 flex flex-col">
                  {comment.authorChannelUrl ? (
                    <a
                      href={comment.authorChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-zinc-200 hover:text-violet-400 truncate flex items-center gap-1 transition-colors"
                    >
                      <span className="truncate">{comment.authorDisplayName}</span>
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-zinc-200 truncate">
                      {comment.authorDisplayName}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500">
                    {formatTimeAgo(comment.publishedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Comment Text */}
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line break-words pl-0.5">
              {comment.textOriginal || comment.textDisplay}
            </p>

            {/* Footer / Stats */}
            <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-white/5 text-[11px] text-zinc-500">
              {comment.likeCount > 0 && (
                <div className="flex items-center gap-1 text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/15">
                  <ThumbsUp className="h-3 w-3 fill-rose-400/20" />
                  <span>{formatCompactNumber(comment.likeCount)}</span>
                </div>
              )}

              {comment.totalReplyCount > 0 && (
                <div className="flex items-center gap-1 text-violet-400 font-medium bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/15">
                  <MessageSquare className="h-3 w-3" />
                  <span>{comment.totalReplyCount} Yanıt</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
