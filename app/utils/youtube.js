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
export const RECOMMENDED_CATALOG = [];

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

