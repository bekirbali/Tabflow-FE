"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  MessageSquare, ThumbsUp, AlertCircle, 
  MessageSquareOff, RefreshCw, Sparkles, User, ExternalLink,
  Send, Loader2, ChevronDown
} from "lucide-react";
import { isYouTubeConnected, postCommentToYouTube } from "../utils/youtube-auth";

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

export default function YouTubeComments({ videoId, addToast, totalCommentCount }) {
  const [comments, setComments] = useState([]);
  const [apiTotalCount, setApiTotalCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Prop olarak verilmişse veya API'den dönmüşse gerçek toplam yorum sayısını al
  const totalCount =
    totalCommentCount !== undefined && totalCommentCount !== null
      ? totalCommentCount
      : apiTotalCount;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConnected(isYouTubeConnected());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const fetchComments = useCallback(async () => {
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

      if (data.totalCommentCount !== undefined && data.totalCommentCount !== null) {
        setApiTotalCount(data.totalCommentCount);
      }

      if (data.disabled) {
        setDisabled(true);
        setComments([]);
        setNextPageToken(null);
      } else {
        setComments(data.comments || []);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error("Comments fetch error:", err);
      setError(err.message || "Yorumlar yüklenirken bir hata oluştu.");
      setNextPageToken(null);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  const handleLoadMore = async () => {
    if (!videoId || !nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await fetch(
        `/api/youtube/comments?videoId=${encodeURIComponent(videoId)}&pageToken=${encodeURIComponent(nextPageToken)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Daha fazla yorum alınamadı.");
      }

      const newComments = data.comments || [];
      setComments((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const filtered = newComments.filter((c) => !existingIds.has(c.id));
        return [...prev, ...filtered];
      });
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error("Load more comments error:", err);
      if (addToast) {
        addToast(err.message || "Daha fazla yorum yüklenirken bir hata oluştu.", "error");
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      if (!isCancelled) fetchComments();
    }, 0);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [fetchComments]);

  const handlePostComment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newComment.trim() || isPosting || !videoId) return;

    if (!isYouTubeConnected()) {
      if (addToast) {
        addToast("YouTube'a uzaktan yorum göndermek için lütfen önce YouTube hesabınızı bağlayın.", "warning");
      }
      return;
    }

    setIsPosting(true);
    try {
      const res = await postCommentToYouTube({
        videoId,
        text: newComment.trim(),
      });

      if (res.success && res.comment) {
        setComments((prev) => [res.comment, ...prev]);
        setNewComment("");
        if (addToast) {
          addToast("Yorumunuz YouTube'da başarıyla paylaşıldı! 💬", "success");
        }
      } else if (res.needsReconnect || res.notConnected) {
        if (addToast) {
          addToast("YouTube oturumunuz sona ermiş. Lütfen tekrar bağlanın.", "warning");
        }
      } else {
        if (addToast) {
          addToast(res.error || "Yorum gönderilemedi.", "error");
        }
      }
    } catch (err) {
      console.error("handlePostComment error:", err);
      if (addToast) addToast("Bağlantı hatası oluştu.", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handlePostComment(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/60 border-t lg:border-t-0 lg:border-l border-white/10 overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-zinc-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              YouTube Yorumları
              {!loading && !disabled && (totalCount !== null && totalCount !== undefined ? (
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono"
                  title={`${Number(totalCount).toLocaleString("tr-TR")} toplam yorum`}
                >
                  {formatCompactNumber(totalCount)}
                </span>
              ) : comments.length > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {comments.length}
                </span>
              ) : null)}
            </h3>
            <p className="text-[11px] text-zinc-400">Tartışmalar ve uzaktan yorum yapma</p>
          </div>
        </div>

        <button
          onClick={fetchComments}
          disabled={loading}
          title="Yorumları Yenile"
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
        </button>
      </div>

      {/* Post Comment Input Section */}
      {!disabled && (
        <div className="p-3.5 px-4 bg-zinc-900/30 border-b border-white/5 shrink-0">
          <form onSubmit={handlePostComment} className="flex flex-col gap-2">
            <div className="relative flex items-center">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isConnected
                    ? "YouTube videosuna yorum yaz... (Ctrl+Enter)"
                    : "YouTube'a bağlı değilsiniz (Bağlanarak yorum atabilirsiniz)"
                }
                rows={2}
                disabled={isPosting}
                className="w-full bg-zinc-950/80 border border-white/10 focus:border-blue-500/60 rounded-xl p-2.5 pr-11 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all resize-none custom-scrollbar"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isPosting}
                title="Yorumu YouTube'a Gönder (Ctrl+Enter)"
                className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white transition-all cursor-pointer shadow-md shadow-blue-950/30 active:scale-95"
              >
                {isPosting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            {!isConnected && (
              <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-blue-500/5 border border-blue-500/10 rounded-lg px-2.5 py-1.5">
                <span>Yorum atmak için YouTube hesabınızı bağlayın:</span>
                <a
                  href="/api/youtube/auth"
                  className="font-bold text-blue-400 hover:text-blue-300 underline shrink-0 ml-2"
                >
                  Bağlan
                </a>
              </div>
            )}
          </form>
        </div>
      )}

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
              className="mt-2 text-[11px] font-bold text-white bg-rose-600/40 hover:bg-rose-600/60 px-3 py-1.5 rounded-lg border border-rose-500/30 transition-all cursor-pointer"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Empty Comments State */}
        {!loading && !error && !disabled && comments.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto text-zinc-400 space-y-3">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 text-zinc-500">
              <Sparkles className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">Henüz Yorum Bulunamadı</p>
              <p className="text-xs text-zinc-500 mt-1">Bu video için ilk yorumu yukarıdan siz gönderin!</p>
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
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = "flex";
                      }
                    }}
                  />
                ) : null}
                <div
                  className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/20 flex items-center justify-center text-xs font-bold shrink-0"
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
                      className="text-xs font-bold text-zinc-200 hover:text-blue-400 truncate flex items-center gap-1 transition-colors"
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
                <div className="flex items-center gap-1 text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/15">
                  <MessageSquare className="h-3 w-3" />
                  <span>{comment.totalReplyCount} Yanıt</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Load More Comments Button */}
        {!loading && !error && !disabled && nextPageToken && (
          <div className="pt-2 pb-4 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer shadow-lg"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span>Daha Fazla Yorum Yükleniyor...</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 text-blue-400" />
                  <span>
                    Daha Fazla Yorum Gör ({comments.length}
                    {totalCount ? ` / ${formatCompactNumber(totalCount)}` : ""}
                    )
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
