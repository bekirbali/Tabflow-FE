import { NextResponse } from "next/server";

/**
 * POST /api/youtube/refresh
 * Body: { refreshToken: string }
 * Süresi dolmuş access_token'ı refresh_token ile yeniler.
 */
export async function POST(request) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: "refreshToken gereklidir." },
        { status: 400 }
      );
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.access_token) {
      return NextResponse.json(
        { error: "Token yenilenirken hata oluştu." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    });
  } catch (err) {
    console.error("YouTube refresh route error:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
