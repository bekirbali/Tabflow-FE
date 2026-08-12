"use client";

import React, { useState, useRef, useEffect } from "react";
import { Link2, Plus, Loader2, AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import { getYouTubeId } from "../utils/youtube";

export default function AddLinkBar({ onAddLink, addToast, onSecretUnlock }) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Secret mode state
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [secretPassword, setSecretPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secretError, setSecretError] = useState(false);
  const secretInputRef = useRef(null);

  // Focus secret input when it opens
  useEffect(() => {
    if (showSecretInput && secretInputRef.current) {
      setTimeout(() => secretInputRef.current?.focus(), 150);
    }
  }, [showSecretInput]);

  const isValidUrl = (str) => {
    if (!str.trim()) return false;
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
        duration: data.metadata?.duration || data.duration || "0:00",
        metadata: data.metadata || {},
      });

      setUrl("");
      addToast("Bağlantı başarıyla akışa eklendi! 🎯", "success");
    } catch (err) {
      console.error("Link ekleme hatası:", err);

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

  // Handle Link2 icon click — toggle secret password input
  const handleLinkIconClick = () => {
    if (!onSecretUnlock) return; // no-op if no handler (not logged in)
    setSecretPassword("");
    setSecretError(false);
    setShowSecretInput((v) => !v);
  };

  // Submit secret password
  const handleSecretSubmit = async (e) => {
    e.preventDefault();
    if (!secretPassword.trim()) return;
    setIsVerifying(true);
    setSecretError(false);

    const ok = await onSecretUnlock(secretPassword);

    if (ok) {
      setShowSecretInput(false);
      setSecretPassword("");
    } else {
      setSecretError(true);
      setTimeout(() => setSecretError(false), 820);
    }
    setIsVerifying(false);
  };

  const handleSecretKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowSecretInput(false);
      setSecretPassword("");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-2">
      <form
        onSubmit={handleSubmit}
        className="transition-all duration-300"
      >
        <div className="relative flex flex-col sm:flex-row gap-3 p-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20">
          <div className="relative flex-1 flex items-center gap-3 px-3">
            {/* Link2 icon — secret unlock trigger (intentionally looks non-interactive) */}
            <button
              type="button"
              onClick={handleLinkIconClick}
              className={`shrink-0 transition-colors duration-200 rounded-lg p-0.5 -ml-0.5 cursor-default ${
                onSecretUnlock && showSecretInput
                  ? "text-violet-400"
                  : "text-zinc-400"
              }`}
            >
              <Link2 className="h-5 w-5" />
            </button>
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

      {/* Secret password input — slides in below the link bar */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          showSecretInput ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <form
          onSubmit={handleSecretSubmit}
          className={`flex items-center gap-2 p-2 pl-4 bg-zinc-950/60 backdrop-blur-xl border rounded-xl shadow-lg transition-all duration-200 ${
            secretError
              ? "border-rose-500/40 animate-[shake_0.4s_ease-in-out]"
              : "border-violet-500/20 focus-within:border-violet-500/50"
          }`}
        >
          <Lock className={`h-3.5 w-3.5 shrink-0 transition-colors ${secretError ? "text-rose-400" : "text-violet-400"}`} />
          <input
            ref={secretInputRef}
            type={showPassword ? "text" : "password"}
            value={secretPassword}
            onChange={(e) => setSecretPassword(e.target.value)}
            onKeyDown={handleSecretKeyDown}
            placeholder="Gizli akış şifresi..."
            autoComplete="current-password"
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none font-mono tracking-wider"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 cursor-pointer"
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            type="submit"
            disabled={isVerifying || !secretPassword.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300 text-xs font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95"
          >
            {isVerifying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span>Gir</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
