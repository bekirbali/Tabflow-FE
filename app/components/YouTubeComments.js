"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  MessageSquare, ThumbsUp, AlertCircle, 
  MessageSquareOff, RefreshCw, Sparkles, User, ExternalLink,
  Send, Loader2, ChevronDown, ChevronUp, CornerDownRight, Trash2, X
} from "lucide-react";
import { 
  isYouTubeConnected, 
  postCommentToYouTube,
  replyToCommentOnYouTube,
  deleteCommentOnYouTube,
  fetchCommentReplies,
  getYouTubeUserProfile
} from "../utils/youtube-auth";

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

export default function YouTubeComments({ videoId, addToast, totalCommentCount, onClose, videoTitle }) {
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

  // Etkileşim Durumları (Replies, Delete, Current User)
  const [userProfile, setUserProfile] = useState(null);
  const [ownCommentIds, setOwnCommentIds] = useState(new Set());
  const [openReplies, setOpenReplies] = useState(new Set());
  const [loadingReplies, setLoadingReplies] = useState(new Set());
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Prop olarak verilmişse veya API'den dönmüşse gerçek toplam yorum sayısını al
  const totalCount =
    totalCommentCount !== undefined && totalCommentCount !== null
      ? totalCommentCount
      : apiTotalCount;

  useEffect(() => {
    const timer = setTimeout(() => {
      const conn = isYouTubeConnected();
      setIsConnected(conn);
      if (conn) {
        getYouTubeUserProfile().then((prof) => {
          if (prof) setUserProfile(prof);
        });
      }
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

  // Yeni Üst Düzey Yorum Gönder
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
        setOwnCommentIds((prev) => new Set([...prev, res.comment.id]));
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

  // Alt Yanıt (Reply) Gönder
  const handlePostReply = async (e, parentId) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!replyText.trim() || isSubmittingReply) return;

    if (!isYouTubeConnected()) {
      if (addToast) {
        addToast("Yanıt göndermek için lütfen önce YouTube hesabınızı bağlayın.", "warning");
      }
      return;
    }

    setIsSubmittingReply(true);
    try {
      const res = await replyToCommentOnYouTube({
        parentId,
        text: replyText.trim(),
      });

      if (res.success && res.comment) {
        const createdReply = res.comment;
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              const currentReplies = c.replies || [];
              return {
                ...c,
                totalReplyCount: (c.totalReplyCount || 0) + 1,
                replies: [...currentReplies, createdReply],
              };
            }
            return c;
          })
        );

        setOwnCommentIds((prev) => new Set([...prev, createdReply.id]));
        setOpenReplies((prev) => new Set([...prev, parentId]));
        setReplyingToId(null);
        setReplyText("");

        if (addToast) {
          addToast("Yanıtınız YouTube'da yayınlandı! 💬", "success");
        }
      } else if (res.needsReconnect || res.notConnected) {
        if (addToast) {
          addToast("YouTube oturumunuz sona ermiş. Lütfen tekrar bağlanın.", "warning");
        }
      } else {
        if (addToast) {
          addToast(res.error || "Yanıt gönderilemedi.", "error");
        }
      }
    } catch (err) {
      console.error("handlePostReply error:", err);
      if (addToast) addToast("Bağlantı hatası oluştu.", "error");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Yorum veya Yanıt Sil
  const handleDeleteComment = async (commentId, parentId = null) => {
    setDeletingCommentId(commentId);
    try {
      const res = await deleteCommentOnYouTube(commentId);
      if (res.success) {
        if (parentId) {
          // Alt yanıtı listeden sil
          setComments((prev) =>
            prev.map((c) => {
              if (c.id === parentId) {
                const updatedReplies = (c.replies || []).filter((r) => r.id !== commentId);
                return {
                  ...c,
                  replies: updatedReplies,
                  totalReplyCount: Math.max(0, (c.totalReplyCount || 1) - 1),
                };
              }
              return c;
            })
          );
        } else {
          // Üst düzey yorumu sil
          setComments((prev) => prev.filter((c) => c.id !== commentId));
          setApiTotalCount((prev) => (prev ? Math.max(0, prev - 1) : null));
        }

        setOwnCommentIds((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });

        if (addToast) addToast("Yorum YouTube'dan silindi.", "success");
      } else {
        if (addToast) addToast(res.error || "Yorum silinemedi.", "error");
      }
    } catch (err) {
      console.error("handleDeleteComment error:", err);
      if (addToast) addToast("Yorum silinirken hata oluştu.", "error");
    } finally {
      setDeletingCommentId(null);
      setConfirmDeleteId(null);
    }
  };

  // Alt Yanıtları Aç / Kapa (Gerekiyorsa Sunucudan Çek)
  const handleToggleReplies = async (commentId) => {
    if (openReplies.has(commentId)) {
      setOpenReplies((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
      return;
    }

    const comment = comments.find((c) => c.id === commentId);
    const needsFetch =
      comment &&
      comment.totalReplyCount > 0 &&
      (!comment.replies || comment.replies.length < comment.totalReplyCount);

    if (needsFetch) {
      setLoadingReplies((prev) => new Set([...prev, commentId]));
      try {
        const res = await fetchCommentReplies(commentId);
        if (res.success && res.replies) {
          setComments((prev) =>
            prev.map((c) => (c.id === commentId ? { ...c, replies: res.replies } : c))
          );
        }
      } catch (err) {
        console.error("fetchCommentReplies error:", err);
      } finally {
        setLoadingReplies((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      }
    }

    setOpenReplies((prev) => new Set([...prev, commentId]));
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handlePostComment(e);
    }
  };

  const isUserOwnComment = (c) => {
    if (!c) return false;
    if (ownCommentIds.has(c.id)) return true;
    if (userProfile?.channelId && c.authorChannelId === userProfile.channelId) return true;
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/60 border-t lg:border-t-0 lg:border-l border-white/10 overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/5 bg-zinc-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                YouTube Yorumları
              </h3>
              {!loading && !disabled && (totalCount !== null && totalCount !== undefined ? (
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono shrink-0"
                  title={`${Number(totalCount).toLocaleString("tr-TR")} toplam yorum`}
                >
                  {formatCompactNumber(totalCount)}
                </span>
              ) : comments.length > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono shrink-0">
                  {comments.length}
                </span>
              ) : null)}
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              {videoTitle ? videoTitle : "Yorum yaz, yanıtla ve tartışmalara katıl"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={fetchComments}
            disabled={loading}
            title="Yorumları Yenile"
            className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Paneli Kapat (ESC)"
              className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all cursor-pointer ml-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
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
                className="w-full bg-zinc-950/80 border border-white/10 focus:border-blue-500/60 rounded-xl p-2.5 pr-11 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
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
                <span>Yorum atmak veya yanıtlamak için hesabınızı bağlayın:</span>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
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
        {!loading && !error && !disabled && comments.map((comment) => {
          const isOwn = isUserOwnComment(comment);
          const hasReplies = (comment.totalReplyCount > 0) || (comment.replies && comment.replies.length > 0);
          const isRepliesOpen = openReplies.has(comment.id);
          const isReplying = replyingToId === comment.id;

          return (
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
                    <div className="flex items-center gap-1.5">
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

                      {isOwn && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Siz
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-zinc-500">
                      {formatTimeAgo(comment.publishedAt)}
                    </span>
                  </div>
                </div>

                {/* Top Actions: Delete / YouTube Link */}
                <div className="flex items-center gap-1 shrink-0">
                  {confirmDeleteId === comment.id ? (
                    <div className="flex items-center gap-1.5 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/25 text-[10px]">
                      <span className="text-rose-300 font-medium">Silinsin mi?</span>
                      <button
                        onClick={() => handleDeleteComment(comment.id, null)}
                        disabled={deletingCommentId === comment.id}
                        className="font-bold text-rose-400 hover:underline cursor-pointer"
                      >
                        {deletingCommentId === comment.id ? "..." : "Evet"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        İptal
                      </button>
                    </div>
                  ) : (
                    <>
                      {isOwn && (
                        <button
                          onClick={() => setConfirmDeleteId(comment.id)}
                          title="Yorumu Sil"
                          className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                      <a
                        href={`https://www.youtube.com/watch?v=${videoId}&lc=${comment.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="YouTube'da Aç"
                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Comment Text */}
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line break-words pl-0.5">
                {comment.textOriginal || comment.textDisplay}
              </p>

              {/* Footer / Stats & Actions */}
              <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/5 text-[11px] text-zinc-500">
                <div className="flex items-center gap-3">
                  {comment.likeCount > 0 && (
                    <div className="flex items-center gap-1 text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/15 text-[10px]">
                      <ThumbsUp className="h-2.5 w-2.5 fill-rose-400/20" />
                      <span>{formatCompactNumber(comment.likeCount)}</span>
                    </div>
                  )}

                  {/* Yanıtla Butonu */}
                  <button
                    onClick={() => {
                      if (isReplying) {
                        setReplyingToId(null);
                        setReplyText("");
                      } else {
                        setReplyingToId(comment.id);
                        setReplyText(`@${comment.authorDisplayName} `);
                      }
                    }}
                    className={`flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                      isReplying ? "text-blue-400 font-bold" : "text-zinc-400 hover:text-blue-400"
                    }`}
                  >
                    <CornerDownRight className="h-3 w-3" />
                    <span>{isReplying ? "Vazgeç" : "Yanıtla"}</span>
                  </button>
                </div>

                {/* Yanıtları Göster / Gizle Butonu */}
                {hasReplies && (
                  <button
                    onClick={() => handleToggleReplies(comment.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-blue-500/10"
                  >
                    {loadingReplies.has(comment.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                    ) : isRepliesOpen ? (
                      <ChevronUp className="h-3 w-3 text-blue-400" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-blue-400" />
                    )}
                    <span>
                      {isRepliesOpen
                        ? "Yanıtları Gizle"
                        : `${comment.totalReplyCount || comment.replies?.length || 0} Yanıt`}
                    </span>
                  </button>
                )}
              </div>

              {/* Inline Reply Form */}
              {isReplying && (
                <form
                  onSubmit={(e) => handlePostReply(e, comment.id)}
                  className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2"
                >
                  <div className="relative">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                          handlePostReply(e, comment.id);
                        }
                      }}
                      autoFocus
                      placeholder={
                        isConnected
                          ? `@${comment.authorDisplayName} kullanıcısına yanıt yaz... (Ctrl+Enter)`
                          : "Yanıt yazmak için YouTube hesabınızı bağlayın"
                      }
                      rows={2}
                      disabled={isSubmittingReply}
                      className="w-full bg-zinc-950/90 border border-white/10 focus:border-blue-500/60 rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToId(null);
                        setReplyText("");
                      }}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSubmittingReply}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-950/30 active:scale-95"
                    >
                      {isSubmittingReply ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      <span>Yanıt Gönder</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Alt Yanıtlar Listesi (Replies Thread) */}
              {isRepliesOpen && comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 pt-2 pl-3 ml-2 border-l-2 border-blue-500/30 space-y-2.5">
                  {comment.replies.map((reply) => {
                    const isOwnReply = isUserOwnComment(reply);

                    return (
                      <div
                        key={reply.id}
                        className="p-2.5 rounded-xl bg-zinc-950/50 border border-white/5 space-y-1.5"
                      >
                        {/* Reply Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {reply.authorProfileImageUrl ? (
                              <img
                                src={reply.authorProfileImageUrl}
                                alt={reply.authorDisplayName}
                                className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ display: reply.authorProfileImageUrl ? "none" : "flex" }}
                            >
                              <User className="h-2.5 w-2.5" />
                            </div>

                            <div className="min-w-0 flex items-center gap-1.5">
                              {reply.authorChannelUrl ? (
                                <a
                                  href={reply.authorChannelUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold text-zinc-200 hover:text-blue-400 truncate"
                                >
                                  {reply.authorDisplayName}
                                </a>
                              ) : (
                                <span className="text-[11px] font-bold text-zinc-200 truncate">
                                  {reply.authorDisplayName}
                                </span>
                              )}

                              {isOwnReply && (
                                <span className="px-1 py-0.2 text-[8px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  Siz
                                </span>
                              )}

                              <span className="text-[9px] text-zinc-500">
                                {formatTimeAgo(reply.publishedAt)}
                              </span>
                            </div>
                          </div>

                          {/* Reply Actions (Sil / Aç) */}
                          <div className="flex items-center gap-1 shrink-0">
                            {confirmDeleteId === reply.id ? (
                              <div className="flex items-center gap-1 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 text-[9px]">
                                <span className="text-rose-300">Sil?</span>
                                <button
                                  onClick={() => handleDeleteComment(reply.id, comment.id)}
                                  disabled={deletingCommentId === reply.id}
                                  className="font-bold text-rose-400 hover:underline cursor-pointer"
                                >
                                  {deletingCommentId === reply.id ? "..." : "Evet"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                                >
                                  İptal
                                </button>
                              </div>
                            ) : (
                              <>
                                {isOwnReply && (
                                  <button
                                    onClick={() => setConfirmDeleteId(reply.id)}
                                    title="Yanıtı Sil"
                                    className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                )}
                                <a
                                  href={`https://www.youtube.com/watch?v=${videoId}&lc=${reply.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="YouTube'da Aç"
                                  className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Reply Text */}
                        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line break-words pl-0.5">
                          {reply.textOriginal || reply.textDisplay}
                        </p>

                        {/* Reply Like Stat */}
                        {reply.likeCount > 0 && (
                          <div className="flex items-center gap-1 text-rose-400 text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded w-fit border border-rose-500/15">
                            <ThumbsUp className="h-2 w-2 fill-rose-400/20" />
                            <span>{formatCompactNumber(reply.likeCount)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

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
