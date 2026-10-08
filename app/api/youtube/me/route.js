import { NextResponse } from "next/server";

/**
 * GET /api/youtube/me
 * Query or Header: accessToken
 * YouTube Data API v3 channels.list?mine=true kullanarak oturum açmış kullanıcının kanal profilini döner.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let accessToken = searchParams.get("accessToken");
    if (!accessToken) {
      accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "YouTube oturumu bulunamadı." },
        { status: 401 }
      );
    }

    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "TOKEN_EXPIRED", message: "YouTube oturum süresi doldu." },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.error?.message || "Kanal bilgisi alınamadı." },
        { status: res.status }
      );
    }

    const data = await res.json();
    const item = data?.items?.[0];
    if (!item) {
      return NextResponse.json(
        { error: "Kanal bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      channelId: item.id,
      title: item.snippet?.title || "",
      avatar: item.snippet?.thumbnails?.default?.url || "",
    });
  } catch (err) {
    console.error("YouTube /me error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
