import { NextResponse } from "next/server";

/**
 * POST /api/youtube/rate
 * Body: { videoId: string, rating: "like" | "none", accessToken: string }
 * YouTube Data API v3 videos.rate endpoint'ini çağırır.
 */
export async function POST(request) {
  try {
    const { videoId, rating, accessToken } = await request.json();

    if (!videoId || !rating || !accessToken) {
      return NextResponse.json(
        { error: "videoId, rating ve accessToken gereklidir." },
        { status: 400 }
      );
    }

    if (!["like", "dislike", "none"].includes(rating)) {
      return NextResponse.json(
        { error: "rating 'like', 'dislike' veya 'none' olmalıdır." },
        { status: 400 }
      );
    }

    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos/rate?id=${videoId}&rating=${rating}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // 204 No Content = başarılı
    if (ytRes.status === 204) {
      return NextResponse.json({ success: true });
    }

    // Token süresi dolmuş
    if (ytRes.status === 401) {
      return NextResponse.json(
        { error: "TOKEN_EXPIRED", message: "YouTube token süresi doldu." },
        { status: 401 }
      );
    }

    const errorData = await ytRes.json().catch(() => ({}));
    console.error("YouTube rate API error:", errorData);

    return NextResponse.json(
      { error: errorData?.error?.message || "YouTube API hatası." },
      { status: ytRes.status }
    );
  } catch (err) {
    console.error("YouTube rate route error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
