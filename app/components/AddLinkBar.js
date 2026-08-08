"use client";

import React, { useState } from "react";
import { Link2, Plus, Loader2, AlertCircle } from "lucide-react";
import { getYouTubeId } from "../utils/youtube";

export default function AddLinkBar({ onAddLink, addToast }) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidUrl = (str) => {
    if (!str.trim()) return false;
    // Basic pattern validation
    try {
      new URL(str.includes("://") ? str : "https://" + str);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) return;

    if (!isValidUrl(url)) {
      setError("Geçersiz URL. Lütfen geçerli bir internet adresi yapıştırın.");
      addToast("Geçersiz bağlantı!", "error");
      return;
    }

    setIsLoading(true);

    // Normalize URL
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    const ytId = getYouTubeId(targetUrl);

    try {
      const response = await fetch(`/api/metadata?url=${encodeURIComponent(targetUrl)}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      onAddLink({
        url: targetUrl,
        type: ytId ? "video" : (data.type || "general"),
        title: data.title || "Yeni Bağlantı",
        source_name: ytId ? "YouTube" : (data.source_name || "Bilinmeyen Kaynak"),
        video_id: ytId || data.video_id || null,
        duration: data.metadata?.duration || "0:00",
        metadata: data.metadata || {},
      });

      setUrl("");
      addToast("Bağlantı başarıyla akışa eklendi! 🎯", "success");
    } catch (err) {
      console.error("Link ekleme hatası:", err);
      
      // Fallback: add link even if scraping API fails
      const parsed = new URL(targetUrl);
      onAddLink({
        url: targetUrl,
        type: ytId ? "video" : "general",
        title: ytId ? "YouTube Videosu" : (parsed.hostname || "Bilinmeyen Başlık"),
        source_name: ytId ? "YouTube" : (parsed.hostname.replace("www.", "") || "Web Sitesi"),
        video_id: ytId || null,
        metadata: ytId ? { thumbnail_url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` } : {},
      });
      setUrl("");
      addToast("Bağlantı varsayılan başlıkla eklendi.", "warning");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    if (val.trim() === "") {
      setError("");
      return;
    }
    if (!isValidUrl(val)) {
      setError("Geçersiz URL formatı.");
    } else {
      setError("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl mx-auto transition-all duration-300"
    >
      <div className="relative flex flex-col sm:flex-row gap-3 p-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20">
        <div className="relative flex-1 flex items-center gap-3 px-3">
          <Link2 className="h-5 w-5 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={url}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="Bir link yapıştırın (örn: Medium makalesi, YouTube videosu veya GitHub reposu...)"
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none disabled:text-zinc-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !url.trim() || !!error}
          className="relative flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 active:scale-98 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-violet-600/10 shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Yükleniyor...</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Akışa Ekle</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-2.5 ml-3 flex items-center gap-1.5 text-xs text-rose-400 font-medium animate-fadeIn">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
