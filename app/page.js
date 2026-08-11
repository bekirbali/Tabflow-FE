"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Inbox, Archive, Check, AlertCircle, AlertTriangle, HelpCircle } from "lucide-react";
import StatsHeader from "./components/StatsHeader";
import AddLinkBar from "./components/AddLinkBar";
import ContentCard from "./components/ContentCard";
import SkeletonCard from "./components/SkeletonCard";
import FocusModeModal from "./components/FocusModeModal";
import AuthModal from "./components/AuthModal";
import { api } from "./utils/api";
import {
  getInitialSeedVideos,
  getYouTubeId,
} from "./utils/youtube";

export default function Home() {
  const [videos, setVideos] = useState([]); // Represents our links/tabs stream
  const [activeTab, setActiveTab] = useState("feed"); // "feed" | "watched"
  const [toasts, setToasts] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth state
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Focus Modal state
  const [selectedFocusLink, setSelectedFocusLink] = useState(null);
  const [isFocusOpen, setIsFocusOpen] = useState(false);

  // Keyboard navigation & Undo Stack state
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [undoStack, setUndoStack] = useState([]);

  // Sync with LocalStorage/Backend after mounting
  useEffect(() => {
    // Defer state updates to avoid synchronous cascading renders during mount
    setTimeout(() => {
      setIsMounted(true);
      const currentUser = api.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        fetchCloudVideos();
      } else {
        loadLocalVideos();
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sekmeye her dönüşte arka planda sessizce yenile (extension ile eklenen videolar dahil)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const currentUser = api.getCurrentUser();
        if (currentUser) {
          silentRefreshVideos();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch from Django Cloud Database
  async function fetchCloudVideos() {
    setIsLoading(true);
    try {
      const data = await api.getLinks();
      const mapped = data.map((v) => {
        const ytId = v.video_id || v.videoId || getYouTubeId(v.url);
        return {
          id: v.id,
          videoId: ytId,
          video_id: ytId,
          url: v.url,
          type: ytId ? "video" : (v.type || "general"),
          title: v.title,
          source_name: ytId ? "YouTube" : (v.source_name || v.author_name || "Bilinmeyen Kaynak"),
          is_clean: v.is_clean || v.is_watched || false,
          is_watched: v.is_clean || v.is_watched || false, // compatibility fallback
          liked: v.liked,
          bookmarked: v.bookmarked,
          duration: v.duration,
          metadata: v.metadata || {},
          curator: v.curator,
          category: v.category,
          created_at: v.created_at
        };
      });
      setVideos(mapped);
    } catch (err) {
      console.error("Cloud links fetch error:", err);
      addToast("Bulut verileri alınamadı, çevrimdışı mod kullanılıyor.", "error");
      loadLocalVideos();
    } finally {
      setIsLoading(false);
    }
  }

  // Arka planda sessizce yenile — yükleme göstergesi olmadan sadece yeni videoları ekler
  async function silentRefreshVideos() {
    try {
      const data = await api.getLinks();
      const mapped = data.map((v) => {
        const ytId = v.video_id || v.videoId || getYouTubeId(v.url);
        return {
          id: v.id,
          videoId: ytId,
          video_id: ytId,
          url: v.url,
          type: ytId ? "video" : (v.type || "general"),
          title: v.title,
          source_name: ytId ? "YouTube" : (v.source_name || v.author_name || "Bilinmeyen Kaynak"),
          is_clean: v.is_clean || v.is_watched || false,
          is_watched: v.is_clean || v.is_watched || false,
          liked: v.liked,
          bookmarked: v.bookmarked,
          duration: v.duration,
          metadata: v.metadata || {},
          curator: v.curator,
          category: v.category,
          created_at: v.created_at
        };
      });
      // Mevcut listeyle karşılaştır, sadece yeni ID'leri öne ekle
      setVideos((prev) => {
        const existingIds = new Set(prev.map((v) => v.id));
        const newItems = mapped.filter((v) => !existingIds.has(v.id));
        if (newItems.length === 0) return prev; // Değişiklik yoksa state'i tetikleme
        return [...newItems, ...prev];
      });
    } catch (err) {
      // Sessiz hata — kullanıcıya toast gösterme
      console.warn("Silent refresh failed:", err);
    }
  }

  // Load from LocalStorage if offline
  function loadLocalVideos() {
    const stored = localStorage.getItem("tabflow_videos");
    if (stored) {
      try {
        setVideos(JSON.parse(stored));
      } catch (e) {
        console.error("LocalStorage okuma hatası:", e);
        const initial = getInitialSeedVideos();
        setVideos(initial);
        localStorage.setItem("tabflow_videos", JSON.stringify(initial));
      }
    } else {
      const initial = getInitialSeedVideos();
      setVideos(initial);
      localStorage.setItem("tabflow_videos", JSON.stringify(initial));
    }
    setIsLoading(false);
  }

  // Toast helper
  function addToast(message, type = "success") {
    const id = Date.now().toString() + Math.random().toString().substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  // Calculate filtered lists based on active tab
  const filteredVideos = useMemo(() => {
    if (activeTab === "feed") {
      return videos.filter((v) => !(v.is_clean || v.is_watched));
    }
    if (activeTab === "watched") {
      return videos.filter((v) => (v.is_clean || v.is_watched));
    }
    return [];
  }, [videos, activeTab]);



  // Helper to scroll active card element into view
  const scrollCardIntoView = (id) => {
    if (!id) return;
    setTimeout(() => {
      const el = document.getElementById(`card-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 50);
  };

  // Add Link Handler
  const handleAddLink = async (linkPayload) => {
    const exists = videos.some((v) => v.url === linkPayload.url);
    if (exists) {
      addToast("Bu bağlantı zaten listenizde ekli!", "warning");
      return;
    }

    const payload = {
      url: linkPayload.url,
      type: linkPayload.type,
      title: linkPayload.title,
      source_name: linkPayload.source_name,
      video_id: linkPayload.video_id,
      is_clean: false,
      liked: false,
      bookmarked: false,
      curator: "@feed_master",
      duration: linkPayload.duration || "0:00",
      category: "Tech",
      metadata: linkPayload.metadata || {}
    };

    if (user) {
      try {
        const newLink = await api.addLink(payload);
        const mapped = {
          id: newLink.id,
          videoId: newLink.video_id,
          url: newLink.url,
          type: newLink.type,
          title: newLink.title,
          source_name: newLink.source_name,
          is_clean: newLink.is_clean,
          liked: newLink.liked,
          bookmarked: newLink.bookmarked,
          duration: newLink.duration,
          metadata: newLink.metadata || {},
          curator: newLink.curator,
          category: newLink.category,
          created_at: newLink.created_at
        };
        setVideos([mapped, ...videos]);
        addToast("Bağlantı buluta kaydedildi! ☁️", "success");
      } catch (err) {
        addToast("Bağlantı buluta kaydedilirken hata oluştu.", "error");
      }
    } else {
      const newVideo = {
        id: `link-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
        tags: ["user-added"]
      };
      // For local compat
      newVideo.is_watched = newVideo.is_clean;
      newVideo.author_name = newVideo.source_name;
      
      const updated = [newVideo, ...videos];
      setVideos(updated);
      localStorage.setItem("tabflow_videos", JSON.stringify(updated));
      addToast("Bağlantı yerel listeye eklendi.", "success");
    }
  };

  // Like Link Handler
  const handleLikeVideo = async (id) => {
    const item = videos.find((v) => v.id === id);
    if (!item) return;
    const newLiked = !item.liked;

    // Optimistic UI update
    const updated = videos.map((v) =>
      v.id === id ? { ...v, liked: newLiked } : v
    );
    setVideos(updated);

    if (user) {
      try {
        await api.updateLink(id, { liked: newLiked });
        addToast(newLiked ? "Beğenildi! ❤️" : "Beğeni geri alındı.", "success");
      } catch (err) {
        fetchCloudVideos();
        addToast("İşlem gerçekleştirilemedi.", "error");
      }
    } else {
      localStorage.setItem("tabflow_videos", JSON.stringify(updated));
      addToast(newLiked ? "Beğenildi! ❤️" : "Beğeni geri alındı.", "success");
    }
  };

  // Bookmark Link Handler
  const handleBookmarkVideo = async (id) => {
    const item = videos.find((v) => v.id === id);
    if (!item) return;
    const newBookmarked = !item.bookmarked;

    // Optimistic UI update
    const updated = videos.map((v) =>
      v.id === id ? { ...v, bookmarked: newBookmarked } : v
    );
    setVideos(updated);

    if (user) {
      try {
        await api.updateLink(id, { bookmarked: newBookmarked });
        addToast(newBookmarked ? "Yer imlerine eklendi! 🔖" : "Yer imi kaldırıldı.", "success");
      } catch (err) {
        fetchCloudVideos();
        addToast("İşlem gerçekleştirilemedi.", "error");
      }
    } else {
      localStorage.setItem("tabflow_videos", JSON.stringify(updated));
      addToast(newBookmarked ? "Yer imlerine eklendi! 🔖" : "Yer imi kaldırıldı.", "success");
    }
  };

  // Delete Link Handler
  const handleDeleteVideo = async (id) => {
    const itemToDelete = videos.find((v) => v.id === id);
    if (!itemToDelete) return;

    // Push delete operation to undo stack
    setUndoStack((prev) => [
      ...prev,
      { type: "delete", video: itemToDelete, index: videos.indexOf(itemToDelete) }
    ]);

    const previousVideos = videos;
    const updated = videos.filter((v) => v.id !== id);
    setVideos(updated);

    // Adjust focused index
    if (focusedIndex >= updated.length) {
      setFocusedIndex(updated.length - 1);
    }

    if (user) {
      try {
        await api.deleteLink(id);
        addToast("Kayıt buluttan silindi. Geri alabilirsiniz (Z) ↩️", "success");
      } catch (err) {
        setVideos(previousVideos);
        addToast("Silinirken hata oluştu.", "error");
      }
    } else {
      localStorage.setItem("tabflow_videos", JSON.stringify(updated));
      addToast("Kayıt yerelden silindi. Geri alabilirsiniz (Z) ↩️", "success");
    }
  };

  // Mark as Clean / Restore / Archive
  const handleActionVideo = async (id) => {
    const item = videos.find((v) => v.id === id);
    if (!item) return;
    const nextState = !(item.is_clean || item.is_watched);

    // Push operation to undo stack
    setUndoStack((prev) => [
      ...prev,
      { type: "archive", id: id, previousState: !nextState }
    ]);

    // Optimistic UI update
    const updated = videos.map((v) =>
      v.id === id ? { ...v, is_clean: nextState, is_watched: nextState } : v
    );
    setVideos(updated);

    // Adjust focused index if card is removed
    if (focusedIndex >= updated.filter((v) => activeTab === "feed" ? !(v.is_clean || v.is_watched) : (v.is_clean || v.is_watched)).length) {
      setFocusedIndex(Math.max(0, focusedIndex - 1));
    }

    if (user) {
      try {
        await api.updateLink(id, { is_clean: nextState });
        if (nextState) {
          addToast("Harika! Temizlendi. (Inbox Zero 🎯) Geri alabilirsiniz (Z)", "success");
        } else {
          addToast("İçerik tekrar Inbox'a taşındı.", "success");
        }
      } catch (err) {
        fetchCloudVideos();
        addToast("İşlem gerçekleştirilemedi.", "error");
      }
    } else {
      localStorage.setItem("tabflow_videos", JSON.stringify(updated));
      if (nextState) {
        addToast("Harika! Temizlendi. (Inbox Zero 🎯) Geri alabilirsiniz (Z)", "success");
      } else {
        addToast("İçerik tekrar Inbox'a taşındı.", "success");
      }
    }
  };

  // Undo Handler
  const handleUndo = async () => {
    if (undoStack.length === 0) {
      addToast("Geri alınacak son işlem bulunamadı.", "warning");
      return;
    }

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));

    if (lastAction.type === "archive") {
      const id = lastAction.id;
      const prevVal = lastAction.previousState;

      const updated = videos.map((v) =>
        v.id === id ? { ...v, is_clean: prevVal, is_watched: prevVal } : v
      );
      setVideos(updated);

      if (user) {
        try {
          await api.updateLink(id, { is_clean: prevVal });
          addToast("İşlem başarıyla geri alındı ↩️", "success");
        } catch (e) {
          addToast("Geri alma senkronizasyonu başarısız oldu.", "error");
        }
      } else {
        localStorage.setItem("tabflow_videos", JSON.stringify(updated));
        addToast("İşlem başarıyla geri alındı ↩️", "success");
      }
    } 
    
    else if (lastAction.type === "delete") {
      const restoredVideo = lastAction.video;
      
      if (user) {
        try {
          // Re-create on cloud database
          const response = await api.addLink(restoredVideo);
          const mapped = {
            ...restoredVideo,
            id: response.id
          };
          setVideos((prev) => {
            const list = [...prev];
            list.splice(lastAction.index, 0, mapped);
            return list;
          });
          addToast("Silinen bağlantı geri yüklendi ↩️", "success");
        } catch (e) {
          addToast("Geri yükleme başarısız.", "error");
        }
      } else {
        setVideos((prev) => {
          const list = [...prev];
          list.splice(lastAction.index, 0, restoredVideo);
          localStorage.setItem("tabflow_videos", JSON.stringify(list));
          return list;
        });
        addToast("Silinen bağlantı geri yüklendi ↩️", "success");
      }
    }
  };

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    fetchCloudVideos();
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    loadLocalVideos();
    addToast("Oturum kapatıldı, yerel listeye dönüldü.", "success");
  };

  // Keyboard navigation event listener
  useEffect(() => {
    if (!isMounted) return;

    const handleGlobalKeyDown = (e) => {
      // Ignore key events if the user is typing in inputs / forms
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Avoid interference when Focus Mode modal is open
      if (isFocusOpen) {
        if (key === "escape") {
          setIsFocusOpen(false);
          setSelectedFocusLink(null);
        }
        return;
      }

      // J: Navigate Down
      if (key === "j") {
        e.preventDefault();
        if (filteredVideos.length === 0) return;
        setFocusedIndex((prev) => {
          const nextIndex = prev + 1 >= filteredVideos.length ? 0 : prev + 1;
          scrollCardIntoView(filteredVideos[nextIndex]?.id);
          return nextIndex;
        });
      }
      
      // K: Navigate Up
      else if (key === "k") {
        e.preventDefault();
        if (filteredVideos.length === 0) return;
        setFocusedIndex((prev) => {
          const nextIndex = prev - 1 < 0 ? filteredVideos.length - 1 : prev - 1;
          scrollCardIntoView(filteredVideos[nextIndex]?.id);
          return nextIndex;
        });
      }

      // W: Mark active as clean/archive
      else if (key === "w") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredVideos.length) {
          const activeCard = filteredVideos[focusedIndex];
          handleActionVideo(activeCard.id);
        }
      }

      // Z: Undo last action
      else if (key === "z") {
        e.preventDefault();
        handleUndo();
      }

      // Enter: Focus mode
      else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredVideos.length) {
          const activeCard = filteredVideos[focusedIndex];
          setSelectedFocusLink(activeCard);
          setIsFocusOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, filteredVideos, focusedIndex, isFocusOpen]);

  const pendingCount = useMemo(() => {
    return videos.filter((v) => !(v.is_clean || v.is_watched)).length;
  }, [videos]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <span>TabFlow yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pb-24 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 pt-8 md:pt-12 flex flex-col gap-8">
        
        {/* Header Section */}
        <StatsHeader 
          videos={videos} 
          user={user} 
          onLoginClick={() => setIsAuthModalOpen(true)} 
          onLogoutClick={handleLogout} 
        />

        {/* Input paste link bar */}
        <AddLinkBar onAddLink={handleAddLink} addToast={addToast} />

        {/* Navigation Switcher Tabs */}
        <div className="flex justify-center mt-2">
          <nav className="flex p-1.5 bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-lg">
            <button
              onClick={() => {
                setActiveTab("feed");
                setFocusedIndex(-1);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === "feed"
                  ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Inbox className="h-4 w-4" />
              <span>My Feed</span>
              {pendingCount > 0 && (
                <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === "feed" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400 border border-white/5"
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("watched");
                setFocusedIndex(-1);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === "watched"
                  ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Archive className="h-4 w-4" />
              <span>Watched</span>
            </button>
          </nav>
        </div>

        {/* Content Lists */}
        <main className="mt-2">
          {/* Inbox Feed and Archive Feed */}
          <div className="animate-fadeIn max-w-2xl mx-auto w-full">
            {isLoading ? (
              // Skeleton loading cards
              <div className="flex flex-col gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredVideos.length > 0 ? (
              <div className="flex flex-col gap-6">
                {filteredVideos.map((video, idx) => (
                  <div id={`card-${video.id}`} key={video.id}>
                    <ContentCard
                      video={video}
                      activeTab={activeTab}
                      onLike={handleLikeVideo}
                      onBookmark={handleBookmarkVideo}
                      onDelete={handleDeleteVideo}
                      onAction={handleActionVideo}
                      isFocused={focusedIndex === idx}
                      onFocusClick={(item) => {
                        setSelectedFocusLink(item);
                        setIsFocusOpen(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // Empty states
              <div className="flex flex-col items-center justify-center p-16 text-center bg-zinc-900/20 border border-white/5 rounded-3xl border-dashed">
                {activeTab === "feed" ? (
                  <div className="flex flex-col items-center max-w-md animate-fadeIn">
                    <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-5 text-emerald-400 shadow-xl shadow-emerald-950/20">
                      <Check className="h-8 w-8 stroke-[3]" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-100">
                      Mükemmel! TabFlow Sıfırlandı
                    </h3>
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                      İşlem bekleyen tüm bağlantıları tamamlayıp <strong>Inbox Zero</strong> başarısına ulaştınız. Zihniniz artık tertemiz! 🎉
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center max-w-md animate-fadeIn">
                    <div className="h-16 w-16 bg-zinc-800/50 border border-white/5 rounded-full flex items-center justify-center mb-5 text-zinc-500">
                      <Archive className="h-7 w-7" />
                    </div>
                    <h3 className="text-md font-bold text-zinc-300">
                      Arşiv Boş
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      Tamamlanan bağlantılar burada arşivlenir.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Keyboard Shortcuts Helper overlay - PREMIUM UI design */}
      <div className="fixed bottom-6 left-6 z-40 bg-zinc-900/90 border border-white/10 p-3 px-4 rounded-2xl shadow-2xl backdrop-blur-md hidden md:flex items-center gap-4 text-xs text-zinc-400 font-semibold select-none">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Klavye</span>
        <span className="h-4 w-[1px] bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-white font-mono font-bold text-[10px]">J</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-white font-mono font-bold text-[10px]">K</kbd>
          <span>Gezin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-white font-mono font-bold text-[10px]">Enter</kbd>
          <span>Odak Modu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-white font-mono font-bold text-[10px]">W</kbd>
          <span>Arşivle (Clean)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-white font-mono font-bold text-[10px]">Z</kbd>
          <span>Geri Al</span>
        </div>
      </div>

      {/* Floating Stack Toasts Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl border text-sm font-semibold shadow-2xl animate-slideInRight ${
              toast.type === "success"
                ? "bg-zinc-900 border-emerald-500/20 text-emerald-400"
                : toast.type === "error"
                ? "bg-zinc-900 border-rose-500/20 text-rose-400"
                : toast.type === "warning"
                ? "bg-zinc-900 border-amber-500/20 text-amber-400"
                : "bg-zinc-900 border-white/5 text-zinc-200"
            }`}
          >
            {toast.type === "success" && (
              <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="h-3.5 w-3.5" />
              </div>
            )}
            {toast.type === "error" && (
              <div className="h-5 w-5 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertCircle className="h-3.5 w-3.5" />
              </div>
            )}
            {toast.type === "warning" && (
              <div className="h-5 w-5 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            )}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="text-zinc-500 hover:text-zinc-300 px-1 font-bold text-lg leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Focus Mode Immersive Reader View Modal */}
      <FocusModeModal
        video={selectedFocusLink}
        isOpen={isFocusOpen}
        onClose={() => {
          setIsFocusOpen(false);
          setSelectedFocusLink(null);
        }}
      />

      {/* Auth Modal UI */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        localVideosCount={user ? 0 : videos.length}
        addToast={addToast}
      />
    </div>
  );
}
