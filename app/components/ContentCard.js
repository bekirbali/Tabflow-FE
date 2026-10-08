"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Play, Trash2, Heart, ThumbsDown, Bookmark, Check, RotateCcw, Plus, Clock, 
  BookOpen, Code, Star, GitFork, Globe, ExternalLink, Maximize2,
  Bell, BellRing, MessageSquare, X
} from "lucide-react";
import { getYouTubeId } from "../utils/youtube";
import { isYouTubeConnected, subscribeToYouTubeChannel, checkYouTubeSubscriptionStatus } from "../utils/youtube-auth";
import YouTubeComments from "./YouTubeComments";

export default function ContentCard({
  video, // This prop represents the link object (renamed to keep compatibility)
  activeTab,
  onLike,
  onDislike,
  onBookmark,
  onDelete,
  onAction, // Mark as Read/Clean / Restore
  onFocusClick, // Callback to open Focus Mode modal
  isFocused, // Keyboard navigation state
  onPlayStart, // Callback when playback starts
  addToast
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [savedProgress, setSavedProgress] = useState(0);
  const [initialStartSec, setInitialStartSec] = useState(0);
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);
  const [isHistorySynced, setIsHistorySynced] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [channelTitle, setChannelTitle] = useState("");
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isCommentsClosing, setIsCommentsClosing] = useState(false);
  const [isCommentsAnimated, setIsCommentsAnimated] = useState(false);
  const [detachOrigin, setDetachOrigin] = useState({ deltaX: -360, deltaY: 0 });
  const cardRef = React.useRef(null);
  const iframeRef = React.useRef(null);

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

  // Format seconds to mm:ss or hh:mm:ss
  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return "0:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // 1. Kaldığı yerden devam et & YouTube geçmiş eşitleme durumunu localStorage'dan oku
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && video_id) {
        const saved = localStorage.getItem(`yt_progress_${video_id}`);
        if (saved && !isNaN(Number(saved))) {
          const sec = Number(saved);
          setSavedProgress(sec);
          setInitialStartSec(sec > 3 ? sec : 0);
        } else {
          setSavedProgress(0);
          setInitialStartSec(0);
        }

        const synced = localStorage.getItem(`yt_synced_${video_id}`);
        if (synced === "true") {
          setIsHistorySynced(true);
        }

        const channelId = metadata?.channel_id;
        const subKey = channelId ? `yt_sub_ch_${channelId}` : `yt_sub_vid_${video_id}`;
        const cachedSub = localStorage.getItem(subKey) || localStorage.getItem(`yt_sub_vid_${video_id}`);
        if (cachedSub === "true") {
          setIsSubscribed(true);
        } else if (cachedSub === "false") {
          setIsSubscribed(false);
        }

        // YouTube OAuth bağlıysa, güncel abonelik durumunu API'den dinamik sorgula
        if (isYouTubeConnected()) {
          checkYouTubeSubscriptionStatus({ videoId: video_id, channelId })
            .then((res) => {
              if (res && res.success && typeof res.subscribed === "boolean") {
                setIsSubscribed(res.subscribed);
                if (res.channelTitle) setChannelTitle(res.channelTitle);
              }
            })
            .catch(() => {});
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [video_id, metadata?.channel_id]);

  // YouTube Abonelik Olaylarını Dinle (diğer kartlardan veya modalden gelen güncellemeler)
  React.useEffect(() => {
    if (type !== "video" || !video_id || typeof window === "undefined") return;

    const handleSubUpdate = (e) => {
      const detail = e.detail;
      if (!detail) return;
      const channelId = metadata?.channel_id;
      const matchesChannel = channelId && detail.channelId && detail.channelId === channelId;
      const matchesVideo = detail.videoId && detail.videoId === video_id;

      if (matchesChannel || matchesVideo) {
        setIsSubscribed(!!detail.subscribed);
        if (detail.channelTitle) setChannelTitle(detail.channelTitle);
      }
    };

    window.addEventListener("tabflow_subscription_updated", handleSubUpdate);
    return () => window.removeEventListener("tabflow_subscription_updated", handleSubUpdate);
  }, [video_id, metadata?.channel_id, type]);

  // YouTube Geçmiş Eşitleme Yanıtını Dinle
  React.useEffect(() => {
    if (!video_id || typeof window === "undefined") return;

    const handleSyncMessage = (event) => {
      if (
        event.data &&
        event.data.source === "tabflow_extension" &&
        event.data.action === "tabflow_history_synced" &&
        event.data.videoId === video_id
      ) {
        setIsSyncingHistory(false);
        if (event.data.success) {
          setIsHistorySynced(true);
          try {
            localStorage.setItem(`yt_synced_${video_id}`, "true");
          } catch (e) {}
        }
      }
    };

    window.addEventListener("message", handleSyncMessage);
    return () => window.removeEventListener("message", handleSyncMessage);
  }, [video_id]);

  // Karttan ayrılma koordinatlarını hesaplayarak yorumları aç
  const openComments = () => {
    if (cardRef.current && typeof window !== "undefined") {
      const isDesktop = window.innerWidth >= 768;
      if (isDesktop) {
        const cardRect = cardRef.current.getBoundingClientRect();
        // Sağ panelin genişliği (yaklaşık 460px) ve sağ boşluğu (16px)
        const panelWidth = Math.min(480, Math.max(380, window.innerWidth * 0.3));
        const panelRight = 16;
        const panelLeft = window.innerWidth - panelRight - panelWidth;
        // Kartın sağ kenarından panelin sol kenarına olan mesafe (karttan başlama noktası)
        const deltaX = Math.round(cardRect.right - panelLeft);
        const deltaY = Math.round(cardRect.top - 16);
        setDetachOrigin({ deltaX, deltaY });
      }
    }
    setIsCommentsClosing(false);
    setIsCommentsAnimated(false);
    setIsCommentsOpen(true);
    window.dispatchEvent(
      new CustomEvent("tabflow_open_comments", { detail: { id } })
    );
  };

  // Yorumları kartın içine geri çekilerek kapat
  const closeComments = () => {
    if (cardRef.current && typeof window !== "undefined" && window.innerWidth >= 768) {
      const cardRect = cardRef.current.getBoundingClientRect();
      const panelWidth = Math.min(480, Math.max(380, window.innerWidth * 0.3));
      const panelRight = 16;
      const panelLeft = window.innerWidth - panelRight - panelWidth;
      const deltaX = Math.round(cardRect.right - panelLeft);
      const deltaY = Math.round(cardRect.top - 16);
      setDetachOrigin({ deltaX, deltaY });
    }
    setIsCommentsAnimated(false);
    setIsCommentsClosing(true);
    setTimeout(() => {
      setIsCommentsOpen(false);
      setIsCommentsClosing(false);
    }, 320);
  };

  // Açılışta bir sonraki frame'de karttan ayrılma animasyonunu tetikle
  useEffect(() => {
    if (isCommentsOpen && !isCommentsClosing) {
      const rAF = requestAnimationFrame(() => {
        setIsCommentsAnimated(true);
      });
      return () => cancelAnimationFrame(rAF);
    }
  }, [isCommentsOpen, isCommentsClosing]);

  // Diğer kartlardan yorum açıldığında bu kartın panelini kapat
  useEffect(() => {
    const handleOtherCardComments = (e) => {
      if (e.detail?.id !== id && isCommentsOpen) {
        closeComments();
      }
    };
    window.addEventListener("tabflow_open_comments", handleOtherCardComments);
    return () => window.removeEventListener("tabflow_open_comments", handleOtherCardComments);
  }, [id, isCommentsOpen]);

  // Yorum paneli açıkken ESC tuşu ile kapatma
  useEffect(() => {
    if (!isCommentsOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeComments();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommentsOpen]);

  // YouTube Geçmişine Sessizce Eşitleme Tetikleyicisi
  const handleSyncHistory = (e) => {
    e.stopPropagation();
    if (!video_id || isSyncingHistory) return;
    setIsSyncingHistory(true);

    let startedReceived = false;

    // 2.5 saniye içinde eklentiden başlatma sinyali gelmezse kullanıcıyı bilgilendir
    const extensionWatchdog = setTimeout(() => {
      if (!startedReceived) {
        setIsSyncingHistory(false);
        if (addToast) {
          addToast(
            "TabFlow eklentisine ulaşılamadı. Eklentinin yüklü olduğundan ve bu sayfayı (F5) yenilediğinizden emin olun.",
            "warning"
          );
        }
      }
    }, 2500);

    const onBridgeMessage = (event) => {
      if (
        event.data &&
        event.data.source === "tabflow_extension" &&
        (event.data.action === "tabflow_history_sync_started" || event.data.action === "tabflow_history_synced") &&
        event.data.videoId === video_id
      ) {
        startedReceived = true;
        clearTimeout(extensionWatchdog);
        window.removeEventListener("message", onBridgeMessage);
      }
    };
    window.addEventListener("message", onBridgeMessage);

    window.postMessage(
      {
        source: "tabflow_web",
        action: "sync_to_youtube_history",
        videoId: video_id,
      },
      "*"
    );

    // Güvenlik zaman aşımı: 16 saniye sonra yanıt gelmezse yüklenme animasyonunu durdur
    setTimeout(() => {
      clearTimeout(extensionWatchdog);
      window.removeEventListener("message", onBridgeMessage);
      setIsSyncingHistory((prev) => (prev ? false : prev));
    }, 16000);
  };

  // YouTube Kanalına Abone Ol / Abonelikten Çık Tetikleyicisi
  const handleToggleSubscribe = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!video_id || isSubscribing) return;

    if (!isYouTubeConnected()) {
      if (addToast) {
        addToast("YouTube kanalına doğrudan abone olmak için YouTube hesabınızı bağlayın.", "warning");
      }
      return;
    }

    setIsSubscribing(true);
    const nextAction = isSubscribed ? "unsubscribe" : "subscribe";
    const channelId = metadata.channel_id;

    try {
      const result = await subscribeToYouTubeChannel({
        videoId: video_id,
        channelId,
        action: nextAction,
      });

      if (result.success) {
        const newSubState = !!result.subscribed;
        setIsSubscribed(newSubState);
        const resolvedTitle = result.channelTitle || source_name;
        if (resolvedTitle) setChannelTitle(resolvedTitle);

        const subKey = (result.channelId || channelId)
          ? `yt_sub_ch_${result.channelId || channelId}`
          : `yt_sub_vid_${video_id}`;
        localStorage.setItem(subKey, newSubState ? "true" : "false");
        localStorage.setItem(`yt_sub_vid_${video_id}`, newSubState ? "true" : "false");

        if (addToast) {
          addToast(
            newSubState
              ? `${resolvedTitle} kanalına başarıyla abone olundu! 🔔`
              : `${resolvedTitle} kanal aboneliği kaldırıldı.`,
            "success"
          );
        }
      } else if (result.needsReconnect || result.notConnected) {
        if (addToast) {
          addToast("YouTube bağlantınız sona ermiş. Lütfen profil menüsünden tekrar bağlanın.", "warning");
        }
      } else {
        if (addToast) {
          addToast(result.error || "Abonelik işlemi gerçekleştirilemedi.", "error");
        }
      }
    } catch (err) {
      console.error("handleToggleSubscribe error:", err);
      if (addToast) addToast("Bağlantı hatası oluştu.", "error");
    } finally {
      setIsSubscribing(false);
    }
  };

  // 2. Oynatılırken YouTube IFrame API ile süreyi anlık kaydet
  // ÖNEMLİ: Oynatma esnasında setState çağırmıyoruz! Sadece localStorage güncellenir.
  // Bu sayede iframe her saniye baştan yüklenmez, video kesintisiz ve akıcı oynar.
  React.useEffect(() => {
    if (!isPlaying || !video_id || typeof window === "undefined") return;

    const handleYTMessage = (event) => {
      try {
        if (typeof event.data === "string") {
          const data = JSON.parse(event.data);
          if (data.event === "infoDelivery" && data.info && data.info.currentTime !== undefined) {
            const time = Math.floor(data.info.currentTime);
            if (time > 2) {
              localStorage.setItem(`yt_progress_${video_id}`, time.toString());
            }
          }
          // Video tamamen bittiğinde (playerState: 0) kaydı temizle ve oynatmayı durdur
          const isEnded =
            (data.event === "infoDelivery" && data.info && data.info.playerState === 0) ||
            (data.event === "onStateChange" && (data.info === 0 || data.data === 0));

          if (isEnded) {
            localStorage.removeItem(`yt_progress_${video_id}`);
            setSavedProgress(0);
            setIsPlaying(false);
          }
        }
      } catch (e) {}
    };

    window.addEventListener("message", handleYTMessage);

    // YouTube iframe'ine listening mesajı gönder (veri akışını başlatır)
    const interval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "listening", id: video_id }),
          "*"
        );
      }
    }, 1500);

    return () => {
      window.removeEventListener("message", handleYTMessage);
      clearInterval(interval);
    };
  }, [isPlaying, video_id]);

  const handleActionClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (typeof window !== "undefined" && video_id) {
      localStorage.removeItem(`yt_progress_${video_id}`);
    }
    setIsFadingOut(true);
    setTimeout(() => {
      onAction(video.id);
      setIsFadingOut(false);
    }, 400);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (typeof window !== "undefined" && video_id) {
      localStorage.removeItem(`yt_progress_${video_id}`);
    }
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
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(`yt_progress_${video_id}`);
        if (saved && !isNaN(Number(saved))) {
          const sec = Number(saved);
          setInitialStartSec(sec > 3 ? sec : 0);
        }
      }
      setIsPlaying(true);
      if (onPlayStart) {
        onPlayStart(video.id);
      }
    } else if (onFocusClick) {
      onFocusClick(video);
    }
  };

  return (
    <article
      ref={cardRef}
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
            <span className="text-xs text-zinc-400 font-medium mt-0.5 flex items-center gap-1">
              {activeTab === "watched" && (video.watched_at || video.is_clean || video.is_watched) ? (
                <>
                  <span className="text-violet-400 font-semibold">İzlendi:</span>
                  <span>{formatTimeAgo(video.watched_at || video.created_at)}</span>
                </>
              ) : (
                <span>{formatTimeAgo(video.created_at || video.addedAt)}</span>
              )}
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
          {type === "video" && isHistorySynced && (
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hidden sm:flex items-center gap-1"
              title="YouTube hesabınızın izleme geçmişine işlendi"
            >
              <Check className="h-3 w-3 stroke-[2.5]" />
              <span>Geçmişte ✓</span>
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
              <div className="relative w-full h-full">
                <iframe
                  ref={iframeRef}
                  src={`https://www.${activeTab === "private" ? "youtube-nocookie" : "youtube"}.com/embed/${video_id}?autoplay=1&enablejsapi=1&rel=0${initialStartSec > 3 ? `&start=${initialStartSec}` : ""}`}
                  title={title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
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
                {/* Duration Badge */}
                {duration && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/80 border border-white/10 backdrop-blur-md text-xs font-bold text-white shadow-lg pointer-events-none z-10">
                    <Clock className="h-3.5 w-3.5 text-rose-400" />
                    <span>{duration}</span>
                  </div>
                )}
                {/* Resume from where you left off badge */}
                {savedProgress > 5 && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-950/90 border border-violet-500/40 backdrop-blur-md text-[11px] font-bold text-violet-200 shadow-xl pointer-events-none z-10">
                    <Play className="h-3 w-3 fill-violet-300" />
                    <span>Kaldığın yer: {formatSeconds(savedProgress)}</span>
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
            title={video.liked ? "Beğeniyi Kaldır" : "Beğen (Like)"}
            className={`p-2.5 rounded-xl transition-all duration-300 active:scale-90 cursor-pointer ${
              video.liked
                ? "text-rose-500 bg-rose-500/10 border border-rose-500/20"
                : "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent"
            }`}
          >
            <Heart className={`h-5 w-5 ${video.liked ? "fill-rose-500" : ""}`} />
          </button>

          {/* Dislike Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDislike) onDislike(video.id);
            }}
            title={video.disliked ? "Beğenmemeyi Kaldır" : "Beğenmedim (Dislike)"}
            className={`p-2.5 rounded-xl transition-all duration-300 active:scale-90 cursor-pointer ${
              video.disliked
                ? "text-zinc-200 bg-zinc-800 border border-zinc-600 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent"
            }`}
          >
            <ThumbsDown className={`h-5 w-5 ${video.disliked ? "fill-zinc-300" : ""}`} />
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

          {/* YouTube Watch History Sync Button (Yalnızca YouTube Videoları İçin) */}
          {type === "video" && video_id && (
            <button
              onClick={handleSyncHistory}
              disabled={isSyncingHistory}
              title={
                isHistorySynced
                  ? "YouTube İzleme Geçmişine Eklendi (%90 izlendi olarak işlendi). Tekrar eşitlemek için tıklayabilirsiniz."
                  : isSyncingHistory
                  ? "YouTube geçmişine arka planda sessizce ekleniyor..."
                  : "YouTube İzleme Geçmişine Ekle (%90 izlendi olarak işler)"
              }
              className={`p-2.5 rounded-xl transition-all duration-300 active:scale-90 flex items-center justify-center ${
                isHistorySynced
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer"
                  : isSyncingHistory
                  ? "text-rose-400 bg-rose-500/10 border border-rose-500/20 animate-pulse cursor-wait"
                  : "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 cursor-pointer"
              }`}
            >
              {isSyncingHistory ? (
                <div className="h-5 w-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
              ) : isHistorySynced ? (
                <Check className="h-5 w-5 text-emerald-400 stroke-[2.5]" />
              ) : (
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              )}
            </button>
          )}

          {/* YouTube Channel Subscribe Button (Kanalı Takip Et / Abone Ol) */}
          {type === "video" && video_id && (
            <button
              onClick={handleToggleSubscribe}
              disabled={isSubscribing}
              title={
                isSubscribing
                  ? "İşleniyor..."
                  : isSubscribed
                  ? `${channelTitle || source_name} kanalına abonesiniz (Abonelikten çıkmak için tıklayın)`
                  : `${channelTitle || source_name} kanalına YouTube'da abone ol`
              }
              className={`p-2.5 rounded-xl transition-all duration-300 active:scale-90 flex items-center justify-center cursor-pointer ${
                isSubscribed
                  ? "text-red-500 bg-red-500/10 border border-red-500/20 shadow-sm shadow-red-950/20"
                  : isSubscribing
                  ? "text-red-400 bg-red-500/10 border border-red-500/20 animate-pulse cursor-wait"
                  : "text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
              }`}
            >
              {isSubscribing ? (
                <div className="h-5 w-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : isSubscribed ? (
                <BellRing className="h-5 w-5 fill-red-500" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
            </button>
          )}

          {/* YouTube Comments & Post Comment Button */}
          {type === "video" && video_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isCommentsOpen) {
                  closeComments();
                } else {
                  openComments();
                }
              }}
              title={isCommentsOpen ? "Yorumları Kapat" : "YouTube Yorumları (Karttan Ayrılma Efekti)"}
              className={`p-2.5 rounded-xl transition-all duration-300 active:scale-90 flex items-center justify-center cursor-pointer border ${
                isCommentsOpen
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40 border-blue-400/50"
                  : "text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 border-transparent hover:border-blue-500/20"
              }`}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          )}
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

      {/* YouTube Comments Panel (Video kartından ayrılarak sağa kayma efekti) */}
      {isCommentsOpen && type === "video" && video_id && typeof document !== "undefined"
        ? createPortal(
            <>
              {/* Mobil görünüm için hafif arka plan katmanı */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  closeComments();
                }}
                className={`md:hidden fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm cursor-pointer transition-opacity duration-300 ${
                  isCommentsAnimated && !isCommentsClosing ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Karttan ayrılarak sağ boşluğa geçen yorum çekmecesi */}
              <aside
                onClick={(e) => e.stopPropagation()}
                style={{
                  transform:
                    typeof window !== "undefined" && window.innerWidth < 768
                      ? isCommentsAnimated && !isCommentsClosing
                        ? "translate3d(0, 0, 0)"
                        : "translate3d(0, 100%, 0)"
                      : isCommentsAnimated && !isCommentsClosing
                      ? "translate3d(0, 0, 0) scale(1)"
                      : `translate3d(${detachOrigin.deltaX}px, ${detachOrigin.deltaY * 0.12}px, 0) scale(0.92)`,
                  opacity: isCommentsAnimated && !isCommentsClosing ? 1 : 0,
                  transformOrigin: "left center",
                  transition:
                    "transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), filter 320ms ease-out",
                  filter: isCommentsAnimated && !isCommentsClosing ? "blur(0px)" : "blur(4px)",
                }}
                className="fixed inset-x-2 bottom-2 top-14 md:inset-x-auto md:top-3 md:bottom-3 md:right-3 z-[100] w-auto md:w-[420px] lg:w-[460px] xl:w-[490px] bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden cursor-default will-change-transform"
              >
                <div className="flex-1 overflow-hidden">
                  <YouTubeComments
                    videoId={video_id}
                    addToast={addToast}
                    totalCommentCount={metadata.comment_count || metadata.commentCount}
                    onClose={closeComments}
                    videoTitle={title}
                  />
                </div>
              </aside>
            </>,
            document.body
          )
        : null}
    </article>
  );
}
