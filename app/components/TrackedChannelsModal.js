"use client";

import React, { useState, useEffect } from "react";
import { 
  X, Search, Plus, Trash2, Tv, Sparkles, 
  Loader2, Check, RefreshCw, ExternalLink 
} from "lucide-react";
import { searchYouTubeChannels, isYouTubeConnected, getValidYouTubeAccessToken } from "../utils/youtube-auth";

export default function TrackedChannelsModal({
  isOpen,
  onClose,
  trackedChannels,
  setTrackedChannels,
  topics,
  setTopics,
  addToast,
  onRefreshDiscover,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncingSubs, setIsSyncingSubs] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsConnected(isYouTubeConnected());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Kanal Arama Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchYouTubeChannels(searchQuery);
        setSearchResults(results || []);
      } catch (err) {
        console.error("Kanal arama hatası:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Kanal Ekle
  const handleAddChannel = (channel) => {
    if (!channel || !channel.id) return;
    if (trackedChannels.some((c) => c.id === channel.id)) {
      if (addToast) addToast("Bu kanal zaten takip listenizde.", "warning");
      return;
    }

    const updated = [
      ...trackedChannels,
      {
        id: channel.id,
        title: channel.title,
        avatar: channel.avatar || "",
      },
    ];
    setTrackedChannels(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("tabflow_tracked_channels", JSON.stringify(updated));
    }
    if (addToast) addToast(`${channel.title} takip listesine eklendi! 📺`, "success");
    setSearchQuery("");
    setSearchResults([]);
  };

  // Kanal Kaldır
  const handleRemoveChannel = (channelId) => {
    const updated = trackedChannels.filter((c) => c.id !== channelId);
    setTrackedChannels(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("tabflow_tracked_channels", JSON.stringify(updated));
    }
    if (addToast) addToast("Kanal takip listesinden kaldırıldı.", "success");
  };

  // YouTube Aboneliklerini İçe Aktar
  const handleSyncSubscriptions = async () => {
    if (!isYouTubeConnected()) {
      if (addToast) addToast("Abonelikleri çekmek için YouTube hesabınızı bağlayın.", "warning");
      return;
    }

    setIsSyncingSubs(true);
    try {
      const accessToken = await getValidYouTubeAccessToken();
      if (!accessToken) throw new Error("Oturum açılamadı.");

      const res = await fetch(
        "https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!res.ok) throw new Error("Abonelikler alınamadı.");
      const data = await res.json();
      const subChannels = (data.items || []).map((item) => ({
        id: item.snippet?.resourceId?.channelId,
        title: item.snippet?.title || "Kanal",
        avatar: item.snippet?.thumbnails?.default?.url || "",
      }));

      const existingIds = new Set(trackedChannels.map((c) => c.id));
      const newChannels = subChannels.filter((c) => c.id && !existingIds.has(c.id));

      if (newChannels.length === 0) {
        if (addToast) addToast("Tüm abonelikleriniz zaten listenizde ekli.", "info");
      } else {
        const updated = [...trackedChannels, ...newChannels];
        setTrackedChannels(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("tabflow_tracked_channels", JSON.stringify(updated));
        }
        if (addToast) addToast(`${newChannels.length} YouTube aboneliği eklendi! 🎉`, "success");
      }
    } catch (err) {
      console.error("Sync subs error:", err);
      if (addToast) addToast("Abonelikler çekilirken bir hata oluştu.", "error");
    } finally {
      setIsSyncingSubs(false);
    }
  };

  // Konu / Etiket Ekle
  const handleAddTopic = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTopic.trim()) return;
    const tag = newTopic.trim().replace(/^#/, "");
    if (topics.includes(tag)) {
      if (addToast) addToast("Bu ilgi alanı zaten ekli.", "warning");
      return;
    }
    const updated = [...topics, tag];
    setTopics(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("tabflow_tracked_topics", JSON.stringify(updated));
    }
    setNewTopic("");
    if (addToast) addToast(`#${tag} ilgi alanı eklendi!`, "success");
  };

  // Konu / Etiket Kaldır
  const handleRemoveTopic = (tag) => {
    const updated = topics.filter((t) => t !== tag);
    setTopics(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("tabflow_tracked_topics", JSON.stringify(updated));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[85vh] bg-zinc-900 border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-scaleIn cursor-default"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-white/10 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Tv className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Keşfet Kaynakları & Kanallar
              </h3>
              <p className="text-[11px] text-zinc-400">
                Takip ettiğin kanalların ve ilgi alanlarının son videoları Keşfet'e düşer
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 custom-scrollbar">
          {/* 1. Kanal Arama & Ekleme */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-blue-400" />
                <span>Yeni YouTube Kanalı Ekle</span>
              </label>

              {isConnected && (
                <button
                  onClick={handleSyncSubscriptions}
                  disabled={isSyncingSubs}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSyncingSubs ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  <span>Aboneliklerimi Aktar</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kanal adı ara (Örn: Barış Özcan, DesignCourse...)"
                className="w-full bg-zinc-950/80 border border-white/10 focus:border-blue-500/60 rounded-xl p-2.5 pl-9 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              {isSearching && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 text-blue-400 animate-spin" />
              )}
            </div>

            {/* Arama Sonuçları */}
            {searchResults.length > 0 && (
              <div className="bg-zinc-950/90 border border-white/10 rounded-xl p-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                {searchResults.map((ch) => {
                  const isAlreadyAdded = trackedChannels.some((c) => c.id === ch.id);
                  return (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {ch.avatar ? (
                          <img
                            src={ch.avatar}
                            alt={ch.title}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                            <Tv className="h-3.5 w-3.5 text-zinc-400" />
                          </div>
                        )}
                        <span className="text-xs font-semibold text-zinc-200 truncate">
                          {ch.title}
                        </span>
                      </div>

                      <button
                        onClick={() => handleAddChannel(ch)}
                        disabled={isAlreadyAdded}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                          isAlreadyAdded
                            ? "bg-zinc-800 text-zinc-500 cursor-default"
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95"
                        }`}
                      >
                        {isAlreadyAdded ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Eklendi</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            <span>Takip Et</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Takip Edilen Kanallar Listesi */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Tv className="h-3.5 w-3.5 text-indigo-400" />
                <span>Takip Edilen Kanallar ({trackedChannels.length})</span>
              </span>
            </div>

            {trackedChannels.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-950/40 border border-white/5 text-center text-xs text-zinc-500">
                Henüz takip edilen kanal yok. Yukarıdan aratarak favori kanallarınızı ekleyin!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar p-0.5">
                {trackedChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-white/5 hover:border-white/10 group transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {ch.avatar ? (
                        <img
                          src={ch.avatar}
                          alt={ch.title}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <Tv className="h-3 w-3" />
                        </div>
                      )}
                      <span className="text-xs font-semibold text-zinc-300 truncate">
                        {ch.title}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveChannel(ch.id)}
                      title="Takibi Bırak"
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. İlgi Alanı Etiketleri (Topics) */}
          <div className="space-y-2.5 pt-2 border-t border-white/5">
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>İlgi Alanı Konuları / Etiketleri</span>
            </span>

            <form onSubmit={handleAddTopic} className="flex gap-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Konu ekle (Örn: React, One Piece, Yapay Zeka...)"
                className="flex-1 bg-zinc-950/80 border border-white/10 focus:border-amber-500/60 rounded-xl p-2 px-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
              <button
                type="submit"
                disabled={!newTopic.trim()}
                className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ekle</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {topics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-white/5 px-2.5 py-1 rounded-lg"
                >
                  <span>#{t}</span>
                  <button
                    onClick={() => handleRemoveTopic(t)}
                    className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 px-5 bg-zinc-950/80 border-t border-white/10 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500">
            Değişiklikler anında Keşfet akışını günceller.
          </span>
          <button
            onClick={() => {
              onClose();
              if (onRefreshDiscover) onRefreshDiscover();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-950/30 active:scale-95"
          >
            Uygula & Yenile
          </button>
        </div>
      </div>
    </div>
  );
}
