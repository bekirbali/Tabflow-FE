import { NextResponse } from "next/server";

// Helper to format YouTube duration
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

// Scrape YouTube duration from watch page HTML
function extractYouTubeDuration(html) {
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

  // Method 2: Check lengthSeconds in ytInitialPlayerResponse JSON (matches "lengthSeconds":"123" or "lengthSeconds":123)
  try {
    const regex = /["\\]?lengthSeconds["\\]?\s*:\s*["\\]?(\d+)["\\]?/;
    const match = html.match(regex);
    if (match && match[1]) {
      const secs = parseInt(match[1], 10);
      if (secs > 0) return formatDuration(secs);
    }
  } catch (e) {}

  // Method 3: Check approxDurationMs in ytInitialPlayerResponse JSON
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
  let url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Invalid or missing url parameter." },
      { status: 400 }
    );
  }

  // Ensure absolute protocol
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname.toLowerCase();
    
    let type = "general";
    let source_name = domain.replace("www.", "");
    let title = "Bilinmeyen Başlık";
    let video_id = null;
    const metadata = {
      url: url,
      domain: domain
    };

    // 1. YouTube & Vimeo Video Detection
    if (domain.includes("youtube.com") || domain.includes("youtu.be") || domain.includes("vimeo.com")) {
      type = "video";
      source_name = domain.includes("youtube") || domain.includes("youtu.be") ? "YouTube" : "Vimeo";
      
      if (source_name === "YouTube") {
        const ytRegexp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const ytMatch = url.match(ytRegexp);
        if (ytMatch && ytMatch[1]) {
          video_id = ytMatch[1];
          metadata.video_id = video_id;
          metadata.thumbnail_url = `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`;
          
          let fetchedViaApi = false;
          const apiKey = process.env.YOUTUBE_API_KEY;
          
          if (apiKey && apiKey !== "YOUR_YOUTUBE_API_KEY") {
            try {
              const apiRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${video_id}&key=${apiKey}`
              ).catch(() => null);
              
              if (apiRes && apiRes.ok) {
                const apiData = await apiRes.json();
                if (apiData && apiData.items && apiData.items.length > 0) {
                  const item = apiData.items[0];
                  title = item.snippet?.title || title;
                  source_name = item.snippet?.channelTitle || source_name;
                  const seconds = parseISO8601Duration(item.contentDetails?.duration);
                  if (seconds) {
                    metadata.duration = formatDuration(seconds);
                  }
                  fetchedViaApi = true;
                }
              }
            } catch (err) {
              console.error("YouTube API request failed, falling back to scraping:", err);
            }
          }
          
          // Fallback to oEmbed and watch page scraping if API key is not present or failed
          if (!fetchedViaApi) {
            try {
              const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
              const watchUrl = `https://www.youtube.com/watch?v=${video_id}`;
              
              const [oembedRes, watchRes] = await Promise.all([
                fetch(oembedUrl).catch(() => null),
                fetch(watchUrl, {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
                  }
                }).catch(() => null)
              ]);

              if (oembedRes && oembedRes.ok) {
                const oembedData = await oembedRes.json();
                title = oembedData.title || title;
                source_name = oembedData.author_name || source_name;
              }

              if (watchRes && watchRes.ok) {
                const watchHtml = await watchRes.text();
                const duration = extractYouTubeDuration(watchHtml);
                if (duration) {
                  metadata.duration = duration;
                }
              }
            } catch (e) {
              console.error("YouTube oEmbed/Watch fail:", e);
            }
          }
        }
      }
    }
    // 2. GitHub & NPM Code Repo Detection
    else if (domain.includes("github.com") || domain.includes("npmjs.com")) {
      type = "code";
      if (domain.includes("github.com")) {
        source_name = "GitHub";
        const pathParts = parsedUrl.pathname.split("/").filter(p => p);
        if (pathParts.length >= 2) {
          const owner = pathParts[0];
          const repo = pathParts[1];
          title = `${owner}/${repo}`;
          metadata.repo_owner = owner;
          metadata.repo_name = repo;

          // Fetch repository statistics from GitHub API (server-to-server)
          try {
            const apiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
              headers: {
                "User-Agent": "TabFlow-Client",
                "Accept": "application/vnd.github.v3+json"
              }
            });
            if (apiRes.ok) {
              const repoData = await apiRes.json();
              title = repoData.full_name || title;
              metadata.description = repoData.description || "";
              metadata.language = repoData.language || "N/A";
              metadata.stars = repoData.stargazers_count || 0;
              metadata.forks = repoData.forks_count || 0;
              metadata.open_issues = repoData.open_issues_count || 0;
            }
          } catch (err) {
            console.error("GitHub API error:", err);
          }
        }
      } else {
        source_name = "NPM";
      }
    }
    // 3. Known Blog Platforms (Article)
    else if (
      domain.includes("medium.com") || 
      domain.includes("substack.com") || 
      domain.includes("dev.to") || 
      domain.includes("hashnode.dev") || 
      domain.includes("wikipedia.org")
    ) {
      type = "article";
      if (domain.includes("medium.com")) source_name = "Medium";
      else if (domain.includes("substack.com")) source_name = "Substack";
      else if (domain.includes("dev.to")) source_name = "DEV Community";
    }

    // 4. Scrape HTML page for OpenGraph and Article Reader content
    if (type !== "video" || !video_id) {
      try {
        const pageRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          next: { revalidate: 3600 } // cache cache
        });

        if (pageRes.ok) {
          const html = await pageRes.text();
          
          // Scrape Title
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            // Remove entities
            title = decodeHtmlEntities(titleMatch[1].trim());
          }

          // Scrape og:site_name
          const siteNameMatch = html.match(/<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)["\']/i) ||
                                html.match(/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:site_name["\']/i);
          if (siteNameMatch && siteNameMatch[1]) {
            source_name = decodeHtmlEntities(siteNameMatch[1].trim());
          }

          // Scrape Description
          const descMatch = html.match(/<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']/i) ||
                            html.match(/<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']/i) ||
                            html.match(/<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']/i);
          if (descMatch && descMatch[1]) {
            metadata.description = decodeHtmlEntities(descMatch[1].trim());
          }

          // Scrape Image
          const imgMatch = html.match(/<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']/i);
          if (imgMatch && imgMatch[1]) {
            metadata.thumbnail_url = imgMatch[1].trim();
          }

          // og:type = article check
          const ogTypeMatch = html.match(/<meta[^>]+property=["\']og:type["\'][^>]+content=["\']([^"\']+)["\']/i);
          if (ogTypeMatch && ogTypeMatch[1] && ogTypeMatch[1].toLowerCase() === "article") {
            type = "article";
          }

          // Extract text paragraphs for Article reading
          if (type === "article" || type === "general") {
            // Match all <p> tags
            const pRegexp = /<p[^>]*>([\s\S]*?)<\/p>/gi;
            let match;
            const paragraphs = [];
            let totalWords = 0;
            
            while ((match = pRegexp.exec(html)) !== null) {
              const text = cleanHtmlText(match[1]);
              if (text.length > 55 && !text.includes("cookie") && !text.includes("policy") && !text.includes("subscribe")) {
                paragraphs.push(text);
                totalWords += text.split(/\s+/).length;
              }
            }

            if (paragraphs.length > 2) {
              metadata.content_paragraphs = paragraphs.slice(0, 15); // Limit paragraphs in JSON
              const minutes = Math.max(1, Math.round(totalWords / 200));
              metadata.read_time = `${minutes} dk okuma`;
              // Upgrade to article if it contains decent readable content paragraphs
              if (type === "general") {
                type = "article";
              }
            }
          }
        }
      } catch (err) {
        console.error("Scraping page error:", err);
      }
    }

    return NextResponse.json({
      url,
      type,
      title,
      source_name,
      video_id,
      metadata
    });

  } catch (error) {
    console.error("General metadata error:", error);
    return NextResponse.json({
      url,
      type: "general",
      title: "Geçersiz Link",
      source_name: "Bilinmeyen Site",
      video_id: null,
      metadata: {}
    });
  }
}

// Helpers
function decodeHtmlEntities(str) {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
}

function cleanHtmlText(htmlStr) {
  // Strip inner html tags
  const stripped = htmlStr.replace(/<[^>]*>/g, "");
  return decodeHtmlEntities(stripped).trim();
}
