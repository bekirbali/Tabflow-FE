"use client";

import React, { useState, useEffect } from "react";
import { 
  X, ExternalLink, BookOpen, Play, Code, Globe, 
  Star, GitFork, AlertCircle, Type, ZoomIn, ZoomOut 
} from "lucide-react";
import { getYouTubeId } from "../utils/youtube";
import YouTubeComments from "./YouTubeComments";

export default function FocusModeModal({ video, isOpen, onClose }) {
  const [fontSize, setFontSize] = useState("base"); // "sm" | "base" | "lg" | "xl"

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

  if (!isOpen || !video) return null;

  const video_id = video.video_id || video.videoId || getYouTubeId(video.url);
  const type = video_id ? "video" : (video.type || "general");
  const title = video.title || "Başlıksız İçerik";
  const source_name = video.source_name || video.author_name || "Bilinmeyen Kaynak";
  const url = video.url;
  const metadata = video.metadata || {};
  const description = metadata.description;
  const read_time = metadata.read_time;
  const paragraphs = metadata.content_paragraphs || [];
  const stars = metadata.stars;
  const forks = metadata.forks;
  const open_issues = metadata.open_issues;
  const language = metadata.language;

  // Font size mapper class
  const getFontSizeClass = () => {
    switch (fontSize) {
      case "sm": return "text-sm leading-relaxed";
      case "lg": return "text-lg leading-relaxed";
      case "xl": return "text-xl leading-relaxed";
      default: return "text-base leading-relaxed";
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn cursor-pointer"
    >
      {/* Modal Container */}
      <div 
        className={`relative w-full h-full md:h-[90vh] bg-zinc-900 border-0 md:border border-white/10 rounded-none md:rounded-3xl flex flex-col overflow-hidden shadow-2xl shadow-violet-950/20 cursor-default transition-all duration-300 ${
          type === "video" ? "md:max-w-6xl" : "md:max-w-4xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-950/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            {/* Header Icon */}
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs ${
              type === "video" 
                ? "bg-rose-500/20 text-rose-400" 
                : type === "article"
                ? "bg-violet-500/20 text-violet-400"
                : type === "code"
                ? "bg-zinc-800 border border-white/5 text-zinc-300"
                : "bg-teal-500/20 text-teal-400"
            }`}>
              {type === "video" && <Play className="h-4 w-4 fill-rose-400" />}
              {type === "article" && <BookOpen className="h-4 w-4" />}
              {type === "code" && <Code className="h-4 w-4" />}
              {type === "general" && <Globe className="h-4 w-4" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{type}</span>
              <span className="text-sm font-bold text-white truncate max-w-sm md:max-w-md">{source_name}</span>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3">
            {/* External link button */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 transition-all"
            >
              <span>Sitede Aç</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            {/* Font settings for Article Reader View */}
            {type === "article" && paragraphs.length > 0 && (
              <div className="flex items-center bg-zinc-800/40 border border-white/5 rounded-xl p-0.5">
                <button
                  onClick={() => setFontSize("sm")}
                  title="Küçük Font"
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    fontSize === "sm" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  A-
                </button>
                <button
                  onClick={() => setFontSize("base")}
                  title="Normal Font"
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    fontSize === "base" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize("lg")}
                  title="Büyük Font"
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    fontSize === "lg" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  A+
                </button>
                <button
                  onClick={() => setFontSize("xl")}
                  title="Ekstra Büyük"
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    fontSize === "xl" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  A++
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-white/5 hidden sm:inline">ESC</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Modal Body (Scrollable Content) */}
        <div className="flex-1 overflow-y-auto bg-zinc-950/10">
          {/* 1. VIDEO VIEW */}
          {type === "video" && video_id && (
            <div className="w-full h-full flex flex-col lg:flex-row bg-zinc-950 overflow-hidden">
              {/* Left Side: Video Player & Description */}
              <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar">
                <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-black shrink-0">
                  <iframe
                    src={`https://www.youtube.com/embed/${video_id}?autoplay=1`}
                    title={title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-5 px-1">
                  <h2 className="text-lg md:text-xl font-bold text-zinc-100 leading-snug">
                    {title}
                  </h2>
                  {description && (
                    <p className="text-xs md:text-sm text-zinc-400 mt-2.5 leading-relaxed bg-zinc-900/40 border border-white/5 rounded-2xl p-4">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Side: YouTube Comments Panel */}
              <div className="w-full lg:w-96 min-h-[380px] lg:min-h-0 lg:h-full shrink-0">
                <YouTubeComments videoId={video_id} />
              </div>
            </div>
          )}

          {/* 2. ARTICLE READER VIEW */}
          {type === "article" && (
            <div className="max-w-2xl mx-auto px-6 py-8 sm:py-12">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-4">
                {title}
              </h1>
              
              <div className="flex items-center gap-3 text-xs text-zinc-400 font-semibold mb-8 pb-4 border-b border-white/5">
                <span>{source_name}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                {read_time && (
                  <span className="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    {read_time}
                  </span>
                )}
              </div>

              {/* Parsed paragraphs or fallback preview */}
              {paragraphs.length > 0 ? (
                <div className={`text-zinc-300 font-normal leading-relaxed space-y-6 ${getFontSizeClass()}`}>
                  {paragraphs.map((p, index) => (
                    <p key={index}>{p}</p>
                  ))}
                  <div className="pt-10 text-center border-t border-white/5">
                    <p className="text-xs text-zinc-500 italic mb-4">
                      Makalenin sonuna ulaştınız.
                    </p>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all active:scale-98"
                    >
                      <span>Orijinal Sitede Yorumları Gör</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                // Fallback Preview
                <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/30 border border-white/5 rounded-2xl text-center">
                  <BookOpen className="h-12 w-12 text-zinc-600 mb-4" />
                  <p className="text-zinc-300 text-sm font-semibold max-w-sm mb-4">
                    Bu makale için tam okuma modu metni ayrıştırılamadı.
                  </p>
                  {description && (
                    <p className="text-zinc-500 text-xs italic max-w-md mb-6 leading-relaxed">
                      &ldquo;{description}&rdquo;
                    </p>
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all active:scale-98"
                  >
                    <span>Makaleyi Orijinal Kaynağından Oku</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 3. CODE REPOSITORY DASHBOARD */}
          {type === "code" && (
            <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col justify-center h-full">
              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center gap-3 text-xs font-bold text-zinc-400 mb-4">
                  <Code className="h-4 w-4" />
                  <span>KOD DEPOSU</span>
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                  {title}
                </h1>
                
                {description ? (
                  <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                    {description}
                  </p>
                ) : (
                  <p className="text-zinc-500 text-sm italic mb-6">
                    Açıklama bulunamadı.
                  </p>
                )}

                {/* Dashboard Stats */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400/10 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Yıldızlar</span>
                    <span className="text-lg font-extrabold text-white mt-0.5">
                      {stars !== undefined ? stars.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <GitFork className="h-5 w-5 text-zinc-400 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Forklar</span>
                    <span className="text-lg font-extrabold text-white mt-0.5">
                      {forks !== undefined ? forks.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Sorunlar</span>
                    <span className="text-lg font-extrabold text-white mt-0.5">
                      {open_issues !== undefined ? open_issues.toLocaleString() : "—"}
                    </span>
                  </div>
                </div>

                {language && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-8 font-semibold">
                    <span>Ana Programlama Dili:</span>
                    <span className="px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-white/5 font-bold">
                      {language}
                    </span>
                  </div>
                )}

                {/* GitHub Action Grid */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-bold text-white bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all active:scale-98"
                  >
                    <Code className="h-4 w-4" />
                    <span>Kodları GitHub&apos;da İncele</span>
                  </a>
                  {source_name === "GitHub" && (
                    <a
                      href={`${url}/issues`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-all border border-white/5 active:scale-98"
                    >
                      <span>Sorunları Aç (Issues)</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. GENERAL LINK VIEW */}
          {type === "general" && (
            <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col justify-center h-full">
              <div className="bg-zinc-900/40 border border-white/15 rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center">
                <Globe className="h-16 w-16 text-zinc-500 mb-6 bg-zinc-800/40 p-4 rounded-3xl border border-white/5" />
                
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  {title}
                </h1>
                
                {description && (
                  <p className="text-zinc-400 text-sm leading-relaxed mb-6 max-w-md">
                    {description}
                  </p>
                )}
                
                <span className="text-xs text-zinc-500 font-semibold block mb-8 font-mono max-w-sm truncate">
                  {url}
                </span>

                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all active:scale-98"
                >
                  <span>Web Sitesine Git</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
