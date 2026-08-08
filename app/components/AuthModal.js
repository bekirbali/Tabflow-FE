"use client";

import React, { useState, useEffect } from "react";
import { Mail, Lock, X, Loader2, Sparkles, User } from "lucide-react";
import { api } from "../utils/api";

export default function AuthModal({ isOpen, onClose, onSuccess, localVideosCount, addToast }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [shouldSync, setShouldSync] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await api.login(email, password);
        addToast("Başarıyla giriş yapıldı!", "success");
      } else {
        data = await api.register(email, password, username);
        addToast("Hesabınız başarıyla oluşturuldu!", "success");
      }

      // Sync local videos if requested and there are local videos
      if (shouldSync && localVideosCount > 0) {
        try {
          const stored = localStorage.getItem("tabflow_videos");
          if (stored) {
            const localVideos = JSON.parse(stored);
            if (localVideos.length > 0) {
              await api.syncLinks(localVideos);
              addToast(`${localVideos.length} video profilinize senkronize edildi!`, "success");
            }
          }
        } catch (syncErr) {
          console.error("Senkronizasyon hatası:", syncErr);
          addToast("Yerel videolar senkronize edilemedi ancak giriş yapıldı.", "warning");
        }
      }

      onSuccess(data.user);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Bir şeyler yanlış gitti. Lütfen bilgilerinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-fadeIn overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/10 mb-4">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {isLogin ? "Bulut Hesabına Giriş Yap" : "Yeni Hesap Oluştur"}
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1.5 max-w-xs leading-relaxed">
            Videolarınızı bulutta yedekleyin ve her yerden erişin.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold leading-relaxed font-sans">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-400">Kullanıcı Adı</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınız"
                  className="w-full h-11 pl-10 pr-4 bg-zinc-950/60 border border-white/5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/25 transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-400">E-posta</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="örnek@eposta.com"
                className="w-full h-11 pl-10 pr-4 bg-zinc-950/60 border border-white/5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/25 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-400">Şifre</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full h-11 pl-10 pr-4 bg-zinc-950/60 border border-white/5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/25 transition-all"
              />
            </div>
          </div>

          {/* Local storage sync option if there are local videos */}
          {localVideosCount > 0 && (
            <div className="flex items-start gap-3 mt-1.5 p-3 rounded-xl bg-zinc-950/40 border border-white/5">
              <input
                type="checkbox"
                id="sync-checkbox"
                checked={shouldSync}
                onChange={(e) => setShouldSync(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500/50"
              />
              <label htmlFor="sync-checkbox" className="text-xs text-zinc-400 font-medium leading-relaxed select-none cursor-pointer">
                Eşitle: Cihazınızdaki <strong className="text-zinc-200">{localVideosCount} videoyu</strong> hesabınızla senkronize edin.
              </label>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-bold text-sm text-white shadow-lg shadow-violet-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>İşlem yapılıyor...</span>
              </>
            ) : (
              <span>{isLogin ? "Giriş Yap" : "Kayıt Ol"}</span>
            )}
          </button>
        </form>

        {/* Footer Link to toggle mode */}
        <div className="mt-6 text-center text-xs text-zinc-500 font-medium">
          {isLogin ? (
            <span>
              Hesabınız yok mu?{" "}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
              >
                Kayıt Ol
              </button>
            </span>
          ) : (
            <span>
              Zaten üye misiniz?{" "}
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
              >
                Giriş Yap
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
