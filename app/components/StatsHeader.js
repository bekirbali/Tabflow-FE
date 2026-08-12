"use client";

import React, { useState } from "react";
import { Inbox, Archive, Heart, Layers, User, LogOut, Key, Copy, Check, Keyboard } from "lucide-react";

export default function StatsHeader({ videos, user, onLoginClick, onLogoutClick, showKeyboardHelper, onToggleKeyboardHelper }) {
  const [copied, setCopied] = useState(false);
  const total = videos.length;
  // Handle both is_clean and is_watched for backend/frontend compatibility
  const watched = videos.filter((v) => v.is_clean || v.is_watched).length;
  const pending = total - watched;
  const liked = videos.filter((v) => v.liked).length;
  const inboxZeroRate = total > 0 ? Math.round((watched / total) * 100) : 100;

  // SVG parameters for radial progress
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (inboxZeroRate / 100) * circumference;

  return (
    <header className="relative w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30 px-5 py-3.5 backdrop-blur-xl text-white shadow-lg transition-all duration-300">
      {/* Minimal decorative glows */}
      <div className="absolute -top-12 -left-12 h-24 w-24 rounded-full bg-violet-600/10 blur-2xl" />
      <div className="absolute -bottom-12 -right-12 h-24 w-24 rounded-full bg-cyan-600/10 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Auth Left/Top */}
        <div className="flex flex-wrap items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 shadow-md shadow-violet-500/10 hover:scale-105 transition-transform duration-200">
              <Layers className="h-5 w-5 text-white stroke-[2]" />
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                TabFlow
              </h1>
              <span className="text-[10px] font-medium text-zinc-500">
                v1.3
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />

          {/* Keyboard Shortcuts Toggle Button */}
          <button
            onClick={onToggleKeyboardHelper}
            title={showKeyboardHelper ? "Klavye kısa yollarını gizle" : "Klavye kısa yollarını göster"}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
              showKeyboardHelper
                ? "bg-violet-600/20 border-violet-500/30 text-violet-300 shadow-sm shadow-violet-500/10"
                : "bg-zinc-950/30 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"
            }`}
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span>Kısa Yollar</span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />

          {/* User Auth Info Inline */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-2 bg-zinc-950/30 px-3 py-1.5 border border-white/5 rounded-xl text-xs text-zinc-300 font-medium">
                <span className="max-w-[120px] truncate text-zinc-400 font-semibold">
                  {user.username || (user.email ? user.email.split("@")[0] : "")}
                </span>
                <span className="text-zinc-700">|</span>
                <button
                  onClick={() => {
                    if (user.api_key) {
                      navigator.clipboard.writeText(user.api_key);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer active:scale-95 transition-all"
                  title="API Anahtarını Kopyala"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-400 animate-[scaleIn_0.2s_ease-out]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>{user.api_key ? `${user.api_key.substring(0, 6)}...` : ""}</span>
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  onClick={onLogoutClick}
                  className="flex items-center gap-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer text-[11px] font-bold"
                  title="Çıkış Yap"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Çıkış</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/10 text-violet-400 hover:text-violet-300 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              >
                <User className="h-3.5 w-3.5" />
                <span>Bulut Senkronizasyonu (Giriş Yap)</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Right */}
        <div className="flex items-center justify-between md:justify-end gap-6 bg-zinc-950/20 md:bg-transparent p-3 md:p-0 rounded-xl border border-white/5 md:border-none">
          {/* Progress Circle (Mini) */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <svg className="h-10 w-10 -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r={radius}
                  className="stroke-zinc-800"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="20"
                  cy="20"
                  r={radius}
                  className="stroke-violet-500 transition-all duration-500 ease-out"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[9px] font-bold text-violet-400">
                {inboxZeroRate}%
              </span>
            </div>
            <div>
              <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Inbox Zero
              </div>
              <div className="text-xs font-semibold text-zinc-300">
                {watched}/{total} Temizlenen
              </div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-zinc-800" />

          {/* Stats Count Inline */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5">
              <Inbox className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-zinc-400">Inbox</span>
              <span className="text-sm font-bold text-white">{pending}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Archive className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-semibold text-zinc-400">Arşiv</span>
              <span className="text-sm font-bold text-white">{watched}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400/10" />
              <span className="text-xs font-semibold text-zinc-400">Beğeniler</span>
              <span className="text-sm font-bold text-white">{liked}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
