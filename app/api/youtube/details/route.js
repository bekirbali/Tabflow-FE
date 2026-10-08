import { NextResponse } from "next/server";

/**
 * GET /api/youtube/details?videoId=XYZ
 * YouTube Data API v3 videos endpoint'ini kullanarak
 * video istatistiklerini (izlenme, beğeni, yorum sayısı) ve
 * video detaylarını (yayın tarihi, kanal adı, açıklama vb.) çeker.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId parametresi gereklidir." },
        { status: 400 }
      );
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    // 1. YouTube Data API v3 ile detaylı istatistikleri ve bilgileri çek
    if (apiKey) {
      const ytUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${encodeURIComponent(
        videoId
      )}&key=${apiKey}`;

      const res = await fetch(ytUrl, {
        next: { revalidate: 180 }, // 3 dakikalık sunucu önbelleği
      });

      if (res.ok) {
        const data = await res.json();
        const item = data?.items?.[0];

        if (item) {
          const snippet = item.snippet || {};
          const statistics = item.statistics || {};
          const contentDetails = item.contentDetails || {};

          return NextResponse.json({
            success: true,
            details: {
              videoId: item.id,
              title: snippet.title || "",
              channelTitle: snippet.channelTitle || "",
              channelId: snippet.channelId || "",
              description: snippet.description || "",
              publishedAt: snippet.publishedAt || null,
              tags: snippet.tags || [],
              viewCount: statistics.viewCount !== undefined ? Number(statistics.viewCount) : null,
              likeCount: statistics.likeCount !== undefined ? Number(statistics.likeCount) : null,
              commentCount: statistics.commentCount !== undefined ? Number(statistics.commentCount) : null,
              duration: contentDetails.duration || null,
            },
          });
        }
      }
    }

    // 2. Yedek Fallback (API Key yoksa veya kota dolmuşsa): NoEmbed / oEmbed üzerinden temel bilgileri al
    try {
      const oembedRes = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
        { next: { revalidate: 3600 } }
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        return NextResponse.json({
          success: true,
          details: {
            videoId,
            title: oembedData.title || "",
            channelTitle: oembedData.author_name || "",
            channelId: "",
            description: "",
            publishedAt: null,
            tags: [],
            viewCount: null,
            likeCount: null,
            commentCount: null,
            duration: null,
          },
        });
      }
    } catch (fallbackErr) {
      console.warn("YouTube fallback error:", fallbackErr);
    }

    return NextResponse.json(
      { error: "Video bilgileri alınamadı." },
      { status: 404 }
    );
  } catch (err) {
    console.error("YouTube details route error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
