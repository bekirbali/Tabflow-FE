import { NextResponse } from "next/server";

/**
 * GET /api/youtube/comments?videoId=XYZ
 * YouTube Data API v3 commentThreads kullanarak videonun en alakalı yorumlarını çeker.
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
    if (!apiKey) {
      return NextResponse.json(
        { error: "YOUTUBE_API_KEY sunucuda tanımlanmamış." },
        { status: 500 }
      );
    }

    const ytUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${encodeURIComponent(
      videoId
    )}&maxResults=25&order=relevance&key=${apiKey}`;

    const res = await fetch(ytUrl, { cache: "no-store" });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const reason = errorData?.error?.errors?.[0]?.reason || "";
      const message = errorData?.error?.message || "YouTube API hatası oluştu.";

      if (reason === "commentsDisabled" || message.includes("disabled comments")) {
        return NextResponse.json(
          {
            disabled: true,
            error: "Bu video için yorumlar yayıncısı tarafından kapatılmış.",
            comments: [],
          },
          { status: 200 }
        );
      }

      console.error("YouTube comments fetch error:", errorData);
      return NextResponse.json(
        { error: message },
        { status: res.status }
      );
    }

    const data = await res.json();
    const rawItems = data?.items || [];

    const comments = rawItems.map((item) => {
      const topComment = item.snippet?.topLevelComment?.snippet || {};
      return {
        id: item.id,
        authorDisplayName: topComment.authorDisplayName || "Kullanıcı",
        authorProfileImageUrl: topComment.authorProfileImageUrl || "",
        authorChannelUrl: topComment.authorChannelUrl || "",
        textDisplay: topComment.textDisplay || "",
        textOriginal: topComment.textOriginal || "",
        likeCount: topComment.likeCount || 0,
        publishedAt: topComment.publishedAt || null,
        totalReplyCount: item.snippet?.totalReplyCount || 0,
      };
    });

    return NextResponse.json({
      success: true,
      commentsCount: comments.length,
      comments,
    });
  } catch (err) {
    console.error("YouTube comments route error:", err);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/youtube/comments
 * Body: { videoId: string, text: string, accessToken: string }
 * YouTube Data API v3 commentThreads.insert kullanarak yeni bir yorum ekler.
 */
export async function POST(request) {
  try {
    const { videoId, text, accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "YouTube oturumu bulunamadı. Lütfen YouTube hesabınızı bağlayın." },
        { status: 401 }
      );
    }

    if (!videoId || !text || !text.trim()) {
      return NextResponse.json(
        { error: "videoId ve yorum metni zorunludur." },
        { status: 400 }
      );
    }

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          snippet: {
            videoId,
            topLevelComment: {
              snippet: {
                textOriginal: text.trim(),
              },
            },
          },
        }),
      }
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "TOKEN_EXPIRED", message: "YouTube yetkilendirme süresi doldu." },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const reason = errorData?.error?.errors?.[0]?.reason || "";
      const message = errorData?.error?.message || "Yorum gönderilemedi.";

      if (reason === "commentsDisabled" || message.includes("disabled comments")) {
        return NextResponse.json(
          { error: "Bu video için yorumlar yayıncısı tarafından kapatılmış." },
          { status: 403 }
        );
      }

      console.error("YouTube comment post error:", errorData);
      return NextResponse.json(
        { error: message },
        { status: res.status }
      );
    }

    const data = await res.json();
    const topComment = data?.snippet?.topLevelComment?.snippet || {};

    return NextResponse.json({
      success: true,
      comment: {
        id: data.id,
        authorDisplayName: topComment.authorDisplayName || "Siz",
        authorProfileImageUrl: topComment.authorProfileImageUrl || "",
        authorChannelUrl: topComment.authorChannelUrl || "",
        textDisplay: topComment.textDisplay || text.trim(),
        textOriginal: topComment.textOriginal || text.trim(),
        likeCount: 0,
        publishedAt: topComment.publishedAt || new Date().toISOString(),
        totalReplyCount: 0,
      },
    });
  } catch (err) {
    console.error("YouTube comments POST route error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}

