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

// Helper to parse ISO 8601 durations (e.g. "PT18M45S" -> 1125)
function parseISO8601Duration(isoStr) {
  const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Scrape duration from YouTube embed page HTML
function extractDurationFromHtml(html) {
  // Method 1: Try parsing PLAYER_VARS embedded_player_response
  try {
    const playerVarsMatch = html.match(/"PLAYER_VARS"\s*:\s*({[\s\S]*?})\s*,\s*"/);
    if (playerVarsMatch) {
      const playerVars = JSON.parse(playerVarsMatch[1]);
      if (playerVars.embedded_player_response) {
        const playerResponse = JSON.parse(playerVars.embedded_player_response);
        const lengthSeconds = playerResponse.videoDetails?.lengthSeconds;
        if (lengthSeconds) {
          const duration = formatDuration(lengthSeconds);
          if (duration) return duration;
        }
      }
    }
  } catch (e) {
    console.error("Error parsing PLAYER_VARS:", e);
  }

  // Method 2: Try direct regex matching for lengthSeconds key
  try {
    const regex = /lengthSeconds["\\]+:\s*["\\]+(\d+)/;
    const match = html.match(regex);
    if (match && match[1]) {
      const duration = formatDuration(match[1]);
      if (duration) return duration;
    }
  } catch (e) {
    console.error("Error with regex fallback:", e);
  }

  // Method 3: Check Schema meta tag itemprop="duration"
  try {
    const durationMetaMatch = html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/i) || 
                              html.match(/itemprop="duration"\s+content="([^"]+)"/i);
    if (durationMetaMatch && durationMetaMatch[1]) {
      const seconds = parseISO8601Duration(durationMetaMatch[1]);
      if (seconds) {
        const duration = formatDuration(seconds);
        if (duration) return duration;
      }
    }
  } catch (e) {
    console.error("Error parsing ISO 8601 duration:", e);
  }

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
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    // Fetch oEmbed info and the embed HTML page in parallel
    const [oembedRes, embedRes] = await Promise.all([
      fetch(oembedUrl).catch(() => null),
      fetch(embedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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
    if (embedRes && embedRes.ok) {
      try {
        const html = await embedRes.text();
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
