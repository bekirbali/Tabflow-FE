import { NextResponse } from "next/server";

// ISO 8601 süresini (PT1H23M45S) mm:ss veya hh:mm:ss formatına dönüştürür
function parseIsoDuration(duration) {
  if (!duration) return "0:00";
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function parseIsoDurationInSeconds(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * GET /api/youtube/discover?searchChannel=xyz
 * YouTube kanallarını arar (kullanıcının takip listesine eklemesi için).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchChannel = searchParams.get("searchChannel");

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY bulunamadı." }, { status: 500 });
    }

    if (!searchChannel || !searchChannel.trim()) {
      return NextResponse.json({ channels: [] });
    }

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
        searchChannel.trim()
      )}&maxResults=6&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json({ channels: [] });
    }

    const data = await res.json();
    const channels = (data.items || []).map((item) => ({
      id: item.snippet?.channelId || item.id?.channelId,
      title: item.snippet?.title || item.snippet?.channelTitle,
      avatar: item.snippet?.thumbnails?.default?.url || "",
      description: item.snippet?.description || "",
    }));

    return NextResponse.json({ success: true, channels });
  } catch (err) {
    console.error("Discover GET search error:", err);
    return NextResponse.json({ error: "Kanal aranamadı." }, { status: 500 });
  }
}

/**
 * POST /api/youtube/discover
 * Body: {
 *   channels?: Array<{ id: string, title?: string }>,
 *   topics?: string[],
 *   accessToken?: string,
 *   includeSubscriptions?: boolean,
 *   excludeVideoIds?: string[]
 * }
 * 
 * Hibrit Keşfet Motoru:
 * 1. Takip edilen / abone olunan kanallardan son yüklenen videoları (uploads playlist) çeker.
 * 2. Kullanıcının ilgi alanı konularına göre (topics search) alakalı videoları arar.
 * 3. Eğer hiç kaynak yoksa trend popüler videoları getirir.
 * 4. Tüm videoların detaylarını ve sürelerini tek seferde optimize biçimde toplar.
 */
export async function POST(request) {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "YOUTUBE_API_KEY tanımlanmamış." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      channels = [],
      topics = [],
      accessToken,
      includeSubscriptions = true,
      excludeVideoIds = [],
      page = 1,
    } = body;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const excludedSet = new Set(excludeVideoIds);
    const discoveredCandidates = []; // { videoId, reason, label, channelTitle }

    // ── 1. Abone Olunan Kanalları Çek (Eğer accessToken varsa ve istendiyse) ──
    const activeChannels = [...channels];
    if (accessToken && includeSubscriptions) {
      try {
        const subRes = await fetch(
          "https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=25",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          }
        );
        if (subRes.ok) {
          const subData = await subRes.json();
          const subChannels = (subData.items || []).map((item) => ({
            id: item.snippet?.resourceId?.channelId,
            title: item.snippet?.title || "Abone Olunan Kanal",
          }));
          // Kanalları birleştir
          const existingIds = new Set(activeChannels.map((c) => c.id));
          for (const ch of subChannels) {
            if (ch.id && !existingIds.has(ch.id)) {
              activeChannels.push(ch);
              existingIds.add(ch.id);
            }
          }
        }
      } catch (err) {
        console.error("Discover subscriptions fetch error:", err);
      }
    }

    // ── 2. Kanalların Son Yüklenen Videolarını Çek (Uploads Playlist: 1 Quota) ──
    // Sayfalamaya göre kanal rotasyonu ve video derinliği ayarlanır
    const channelBatchSize = 5;
    let channelsToQuery = [];
    if (activeChannels.length > 0) {
      if (activeChannels.length > channelBatchSize) {
        const startIdx = ((pageNum - 1) * channelBatchSize) % activeChannels.length;
        channelsToQuery = activeChannels.slice(startIdx, startIdx + channelBatchSize);
        if (channelsToQuery.length < channelBatchSize) {
          channelsToQuery = [
            ...channelsToQuery,
            ...activeChannels.slice(0, channelBatchSize - channelsToQuery.length),
          ];
        }
      } else {
        channelsToQuery = activeChannels;
      }
    }

    const itemsPerChannel = Math.min(4 + Math.floor((pageNum - 1) * 2), 12);
    const channelPromises = channelsToQuery.map(async (ch) => {
      try {
        if (!ch.id || !ch.id.startsWith("UC")) return [];
        // YouTube channel uploads playlist ID: UC -> UU
        const uploadsPlaylistId = "UU" + ch.id.slice(2);
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(
            uploadsPlaylistId
          )}&maxResults=${itemsPerChannel}&key=${apiKey}`,
          { next: { revalidate: 300 } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map((item) => ({
          videoId: item.snippet?.resourceId?.videoId,
          title: item.snippet?.title,
          channelTitle: item.snippet?.channelTitle || ch.title,
          publishedAt: item.snippet?.publishedAt,
          reason: "channel",
          label: ch.title || item.snippet?.channelTitle,
        }));
      } catch {
        return [];
      }
    });

    // ── 3. İlgi Alanı Konularına Göre Arama Yap (Topics Search) ──────────────
    // Sayfa numarasına göre konu varyasyonları ve rotasyonu
    const topicVariations = [
      "",
      "tutorial OR tips",
      "guide OR showcase",
      "best practices OR advanced",
      "overview OR walkthrough",
    ];
    const mod = topicVariations[(pageNum - 1) % topicVariations.length];

    let topicsToQuery = [];
    if (topics.length > 0) {
      const topicOffset = (pageNum - 1) % topics.length;
      topicsToQuery = [
        topics[topicOffset],
        topics[(topicOffset + 1) % topics.length],
      ].filter(Boolean);
    }

    const topicPromises = topicsToQuery.map(async (topic) => {
      try {
        if (!topic || !topic.trim()) return [];
        const cleanTopic = topic.trim();
        let searchQuery = cleanTopic.toLowerCase() === "react"
          ? "React JS development"
          : cleanTopic;
        if (mod) searchQuery += ` ${mod}`;
        searchQuery += " -reaction";

        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
            searchQuery
          )}&type=video&order=relevance&maxResults=8&key=${apiKey}`,
          { next: { revalidate: 600 } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map((item) => ({
          videoId: item.id?.videoId,
          title: item.snippet?.title,
          channelTitle: item.snippet?.channelTitle,
          publishedAt: item.snippet?.publishedAt,
          reason: "topic",
          label: topic.trim(),
        }));
      } catch {
        return [];
      }
    });

    const [channelResults, topicResults] = await Promise.all([
      Promise.all(channelPromises),
      Promise.all(topicPromises),
    ]);

    // Sonuçları düzleştir ve topla
    channelResults.flat().forEach((v) => {
      if (v.videoId && !excludedSet.has(v.videoId)) {
        discoveredCandidates.push(v);
      }
    });

    topicResults.flat().forEach((v) => {
      if (v.videoId && !excludedSet.has(v.videoId)) {
        discoveredCandidates.push(v);
      }
    });

    // ── 4. Eğer Hiç veya Çok Az Aday Bulunamazsa: Popüler Trendleri Getir ───────
    if (discoveredCandidates.length < 5) {
      try {
        const popRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=TR&maxResults=20&key=${apiKey}`,
          { next: { revalidate: 600 } }
        );
        if (popRes.ok) {
          const popData = await popRes.json();
          (popData.items || []).forEach((item) => {
            if (item.id && !excludedSet.has(item.id)) {
              discoveredCandidates.push({
                videoId: item.id,
                title: item.snippet?.title,
                channelTitle: item.snippet?.channelTitle,
                publishedAt: item.snippet?.publishedAt,
                reason: "popular",
                label: "Trend",
              });
            }
          });
        }
      } catch (err) {
        console.error("Discover popular fetch error:", err);
      }
    }

    // ── 5. Tekrarları Temizle ─────────────────────────────────────────────────
    const seen = new Set();
    const uniqueCandidates = [];
    for (const c of discoveredCandidates) {
      if (!seen.has(c.videoId)) {
        seen.add(c.videoId);
        uniqueCandidates.push(c);
      }
    }

    if (uniqueCandidates.length === 0) {
      return NextResponse.json({ success: true, videos: [] });
    }

    // ── 6. Videoların Süre ve Detaylarını Tek İstekte Topla (Bulk Details) ─────
    const candidateIds = uniqueCandidates.map((c) => c.videoId).slice(0, 30);
    let detailsMap = new Map();

    try {
      const detailsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${candidateIds.join(
          ","
        )}&key=${apiKey}`,
        { next: { revalidate: 600 } }
      );
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        for (const item of detailsData.items || []) {
          detailsMap.set(item.id, item);
        }
      }
    } catch (err) {
      console.error("Bulk video details error:", err);
    }

    // ── 7. Kesin Shorts Kontrolü (Dikey vs Yatay Ayrımı) ───────────────────────
    // Başlığında #shorts etiketi olanlar doğrudan Shorts'tur.
    // Etiketi olmayan ancak süresi <= 180s olan videolar için YouTube HEAD redirect kontrolü yapılır:
    // Dikey Shorts -> 200 döner, Yatay video -> 303 (/watch?v=) yönlendirir.
    const shortsCheckMap = new Map();
    const checksToRun = uniqueCandidates.map(async (item) => {
      const detail = detailsMap.get(item.videoId);
      const snippet = detail?.snippet || {};
      const contentDetails = detail?.contentDetails || {};

      const titleText = snippet.title || item.title || "";
      const descText = snippet.description || "";
      const hasShortsTag = /#shorts\b/i.test(titleText) || /#shorts\b/i.test(descText);

      if (hasShortsTag) {
        shortsCheckMap.set(item.videoId, true);
        return;
      }

      const durationSec = parseIsoDurationInSeconds(contentDetails.duration);
      if (durationSec > 0 && durationSec <= 180) {
        try {
          const res = await fetch(`https://www.youtube.com/shorts/${item.videoId}`, {
            method: "HEAD",
            redirect: "manual",
          });
          // YouTube dikey shorts için 200, normal yatay videolar için 303 (watch?v=) döner
          shortsCheckMap.set(item.videoId, res.status === 200);
        } catch {
          shortsCheckMap.set(item.videoId, false);
        }
      } else {
        shortsCheckMap.set(item.videoId, false);
      }
    });

    await Promise.all(checksToRun);

    // ── 8. Sonuçları Formatla ────────────────────────────────────────────────
    const finalVideos = uniqueCandidates
      .map((item) => {
        const detail = detailsMap.get(item.videoId);
        const snippet = detail?.snippet || {};
        const contentDetails = detail?.contentDetails || {};

        const duration = parseIsoDuration(contentDetails.duration);
        const titleText = snippet.title || item.title || "";
        const descText = snippet.description || "";
        const isShorts = shortsCheckMap.get(item.videoId) ?? false;

        const thumbnail =
          snippet.thumbnails?.maxres?.url ||
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.medium?.url ||
          `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;

        return {
          id: `disc_${item.videoId}`,
          videoId: item.videoId,
          video_id: item.videoId,
          url: isShorts ? `https://www.youtube.com/shorts/${item.videoId}` : `https://www.youtube.com/watch?v=${item.videoId}`,
          type: "video",
          title: titleText || "YouTube Videosu",
          source_name: snippet.channelTitle || item.channelTitle || "YouTube",
          channelId: snippet.channelId,
          duration,
          is_shorts: isShorts,
          category: isShorts ? "Shorts" : "Keşfet",
          curator: "@discover",
          created_at: snippet.publishedAt || item.publishedAt || new Date().toISOString(),
          is_clean: false,
          is_watched: false,
          liked: false,
          bookmarked: false,
          metadata: {
            video_id: item.videoId,
            thumbnail_url: thumbnail,
            description: descText,
            duration,
            is_shorts: isShorts,
            discoveryReason: item.reason,
            discoveryLabel: item.label,
          },
        };
      })
      .filter((v) => v.videoId);

    return NextResponse.json({
      success: true,
      page: pageNum,
      count: finalVideos.length,
      hasMore: finalVideos.length > 0,
      videos: finalVideos,
    });
  } catch (err) {
    console.error("YouTube discover route error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
