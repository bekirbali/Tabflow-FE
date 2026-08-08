/**
 * Parses a YouTube URL to extract the 11-character video ID.
 */
export function getYouTubeId(url) {
  if (!url) return null;
  try {
    // 1. YouTube Shorts: youtube.com/shorts/VIDEO_ID
    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

    // 2. Standard watch URL, embed, youtu.be, etc.
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2] && match[2].length === 11) return match[2];

    // 3. Fallback URLSearchParams for watch?v=...
    if (url.includes("youtube.com")) {
      const parsed = new URL(url);
      const v = parsed.searchParams.get("v");
      if (v && v.length === 11) return v;
    }
  } catch (_) {}
  return null;
}

// Pre-defined catalog of high-quality content for the "For You" (Keşfet) feed
export const RECOMMENDED_CATALOG = [
  {
    url: "https://www.youtube.com/watch?v=B2WnJgqS884",
    video_id: "B2WnJgqS884",
    type: "video",
    title: "10 Yıl Sonra Dünya Nasıl Olacak? (Gelecek Senaryoları)",
    source_name: "Barış Özcan",
    category: "Science",
    tags: ["tech", "future", "science", "trends"],
    duration: "18:45",
    curator: "@feed_master",
    addedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    metadata: {
      thumbnail_url: "https://img.youtube.com/vi/B2WnJgqS884/hqdefault.jpg"
    }
  },
  {
    url: "https://medium.com/design-code/how-i-design-websites-complete-process",
    type: "article",
    title: "How I Design Websites - My Complete Process",
    source_name: "DesignCourse",
    category: "Design",
    tags: ["design", "uiux", "webdev", "process"],
    duration: "0:00",
    curator: "@design_pro",
    addedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    metadata: {
      description: "A walk through my complete design workflow, starting from initial wireframes in Figma to a responsive web page implementation.",
      read_time: "8 dk okuma"
    }
  },
  {
    url: "https://github.com/fastapi/fastapi",
    type: "code",
    title: "fastapi/fastapi",
    source_name: "GitHub",
    category: "Tech",
    tags: ["tech", "backend", "python", "api"],
    duration: "0:00",
    curator: "@feed_master",
    addedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    metadata: {
      description: "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
      language: "Python",
      stars: 76000,
      forks: 6200
    }
  },
  {
    url: "https://www.youtube.com/watch?v=3yq8P8G9cK8",
    video_id: "3yq8P8G9cK8",
    type: "video",
    title: "Next.js 16 - What is New & Breaking Changes Explained",
    source_name: "Vercel",
    category: "Tech",
    tags: ["tech", "nextjs", "webdev", "react"],
    duration: "14:10",
    curator: "@feed_master",
    addedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    metadata: {
      thumbnail_url: "https://img.youtube.com/vi/3yq8P8G9cK8/hqdefault.jpg"
    }
  },
  {
    url: "https://github.com/facebook/react",
    type: "code",
    title: "facebook/react",
    source_name: "GitHub",
    category: "Tech",
    tags: ["tech", "webdev", "react", "frontend"],
    duration: "0:00",
    curator: "@feed_master",
    addedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    metadata: {
      description: "The library for web and native user interfaces.",
      language: "JavaScript",
      stars: 224000,
      forks: 46000
    }
  },
  {
    url: "https://medium.com/productivity-hacks/building-a-second-brain-system",
    type: "article",
    title: "How to Build a Second Brain (Productivity System)",
    source_name: "Ali Abdaal",
    category: "Productivity",
    tags: ["productivity", "learning", "books", "system"],
    duration: "0:00",
    curator: "@productivity_geek",
    addedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    metadata: {
      description: "An in-depth summary of Tiago Forte's Second Brain methodology. Learn how to capture, organize, distill, and express your thoughts.",
      read_time: "10 dk okuma"
    }
  },
  {
    url: "https://www.youtube.com/watch?v=9H7O6-yT4aM",
    video_id: "9H7O6-yT4aM",
    type: "video",
    title: "My 2026 Desk Setup: Clean & Productive",
    source_name: "Marques Brownlee",
    category: "Tech",
    tags: ["tech", "setup", "desk", "productivity"],
    duration: "12:15",
    curator: "@feed_master",
    addedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    metadata: {
      thumbnail_url: "https://img.youtube.com/vi/9H7O6-yT4aM/hqdefault.jpg"
    }
  },
  {
    url: "https://news.ycombinator.com",
    type: "general",
    title: "Hacker News",
    source_name: "Y Combinator",
    category: "Tech",
    tags: ["tech", "news", "startup"],
    duration: "0:00",
    curator: "@feed_master",
    addedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    metadata: {
      description: "Hacker News is a social news website focusing on computer science and entrepreneurship."
    }
  }
];

// Generates a mock video duration format like "14:20" or "8:45"
export function generateMockDuration() {
  const mins = Math.floor(Math.random() * 45) + 3; // 3 to 47 mins
  const secs = Math.floor(Math.random() * 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Computes custom recommendations based on user interaction (added/liked links).
 * Filters out links already in user's Feed or History.
 */
export function getRecommendations(userLinks) {
  const userUrls = new Set(userLinks.map(v => v.url));
  const activeOrLiked = userLinks.filter(v => !v.is_clean || v.liked);

  const likedSources = {};
  const likedTags = {};

  activeOrLiked.forEach(v => {
    const source = v.source_name || v.author_name;
    if (source) {
      likedSources[source] = (likedSources[source] || 0) + 1;
    }
    const tags = v.tags || [];
    tags.forEach(t => {
      likedTags[t] = (likedTags[t] || 0) + 1;
    });
  });

  // Calculate scores for catalog items
  const recommendations = RECOMMENDED_CATALOG
    .filter(item => !userUrls.has(item.url)) // Don't recommend what they already have
    .map(item => {
      let score = 0;

      // Source match adds weight
      if (likedSources[item.source_name]) {
        score += likedSources[item.source_name] * 3;
      }

      // Tag match adds weight
      const itemTags = item.tags || [];
      itemTags.forEach(t => {
        if (likedTags[t]) {
          score += likedTags[t] * 1.5;
        }
      });

      // Add category overlap check
      const matchedCategories = activeOrLiked.filter(v => v.category === item.category);
      score += matchedCategories.length * 2;

      // Add a small randomness factor so recommendations feel dynamic
      score += Math.random() * 0.5;

      return { ...item, score };
    });

  // Sort by score descending and take top 6 recommendations
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(rec => {
      // Map videoId key for backward compatibility in frontend components
      if (rec.type === "video") {
        rec.videoId = rec.video_id;
      }
      return rec;
    });
}

/**
 * Seeds initial mock data for first-time users.
 */
export function getInitialSeedVideos() {
  return [];
}

