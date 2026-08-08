import { NextResponse } from "next/server";

// Helper to format seconds (e.g. 1125 -> "18:45", 3723 -> "1:02:03")
function formatDuration(secondsStr) {
  const seconds = parseInt(secondsStr, 10);
  if (isNaN(seconds)) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const formattedSecs = s < 10 ? `0${s}` : s;
  
  if (h > 0) {
    const formattedMins = m < 10 ? `0${m}` : m;
    return `${h}:${formattedMins}:${formattedSecs}`;
  }
  return `${m}:${formattedSecs}`;
}

// Helper to parse ISO 8601 durations (e.g. "PT18M45S" -> 1125, "PT1H2M3S" -> 3723)
function parseISO8601Duration(isoStr) {
  if (!isoStr) return null;
  const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return null;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

// Scrape duration from YouTube watch page HTML
function extractDurationFromHtml(html) {
  if (!html) return null;

  // Method 1: Check Schema meta tag itemprop="duration"
  try {
    const durationMetaMatch = html.match(/itemprop=["']duration["']\s+content=["']([^"']+)["']/i) || 
                              html.match(/content=["']([^"']+)["']\s+itemprop=["']duration["']/i);
    if (durationMetaMatch && durationMetaMatch[1]) {
      const seconds = parseISO8601Duration(durationMetaMatch[1]);
      if (seconds) return formatDuration(seconds);
    }
  } catch (e) {}

  // Method 2: Check lengthSeconds in ytInitialPlayerResponse JSON
  try {
    const regex = /["\\]?lengthSeconds["\\]?\s*:\s*["\\]?(\d+)["\\]?/;
    const match = html.match(regex);
    if (match && match[1]) {
      const secs = parseInt(match[1], 10);
      if (secs > 0) return formatDuration(secs);
    }
  } catch (e) {}

  // Method 3: Check approxDurationMs
  try {
    const regexMs = /["\\]?approxDurationMs["\\]?\s*:\s*["\\]?(\d+)["\\]?/;
    const matchMs = html.match(regexMs);
    if (matchMs && matchMs[1]) {
      const secs = Math.round(parseInt(matchMs[1], 10) / 1000);
      if (secs > 0) return formatDuration(secs);
    }
  } catch (e) {}

  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId || videoId.length !== 11) {
    return NextResponse.json(
      { error: "Invalid or missing videoId parameter." },
      { status: 400 }
    );
  }

  try {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;

    // Fetch oEmbed info and watch page HTML in parallel
    const [oembedRes, watchRes] = await Promise.all([
      fetch(oembedUrl).catch(() => null),
      fetch(youtubeUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      }).catch(() => null)
    ]);

    let oembedData = {};
    if (oembedRes && oembedRes.ok) {
      oembedData = await oembedRes.json();
    } else {
      throw new Error(`Failed to fetch oEmbed data`);
    }

    let duration = null;
    if (watchRes && watchRes.ok) {
      try {
        const html = await watchRes.text();
        duration = extractDurationFromHtml(html);
      } catch (err) {
        console.error("Failed to parse HTML for duration:", err);
      }
    }

    return NextResponse.json({
      title: oembedData.title || "YouTube Video",
      author_name: oembedData.author_name || "Unknown Creator",
      thumbnail_url: oembedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: duration
    });
  } catch (error) {
    console.error("oEmbed proxy error:", error);
    return NextResponse.json({
      title: "YouTube Video",
      author_name: "Unknown Creator",
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: null,
      fallback: true,
    });
  }
}
