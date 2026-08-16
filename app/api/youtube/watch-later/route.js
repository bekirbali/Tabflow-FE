import { NextResponse } from "next/server";

/**
 * POST /api/youtube/watch-later
 * Body: { videoId: string, action: "add" | "remove", accessToken: string }
 * YouTube "Daha Sonra İzle" (WL) listesine video ekler/çıkarır.
 */
export async function POST(request) {
  try {
    const { videoId, action, accessToken } = await request.json();

    if (!videoId || !action || !accessToken) {
      return NextResponse.json(
        { error: "videoId, action ve accessToken gereklidir." },
        { status: 400 }
      );
    }

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    if (action === "add") {
      // "Daha Sonra İzle" playlist ID'si her hesap için "WL"dir
      const ytRes = await fetch(
        "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet",
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            snippet: {
              playlistId: "WL",
              resourceId: {
                kind: "youtube#video",
                videoId: videoId,
              },
            },
          }),
        }
      );

      if (ytRes.status === 401) {
        return NextResponse.json(
          { error: "TOKEN_EXPIRED", message: "YouTube token süresi doldu." },
          { status: 401 }
        );
      }

      if (!ytRes.ok) {
        const errorData = await ytRes.json().catch(() => ({}));
        // Video zaten "Daha Sonra İzle" listesinde olabilir — hata değil
        const message = errorData?.error?.message || "";
        if (message.includes("duplicate") || message.includes("already")) {
          return NextResponse.json({ success: true, alreadyAdded: true });
        }
        console.error("YouTube watch-later add error:", errorData);
        return NextResponse.json(
          { error: message || "YouTube API hatası." },
          { status: ytRes.status }
        );
      }

      return NextResponse.json({ success: true });

    } else if (action === "remove") {
      // Önce playlistItem ID'sini bul
      const listRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=id&playlistId=WL&videoId=${videoId}&maxResults=1`,
        { headers: authHeaders }
      );

      if (listRes.status === 401) {
        return NextResponse.json(
          { error: "TOKEN_EXPIRED", message: "YouTube token süresi doldu." },
          { status: 401 }
        );
      }

      const listData = await listRes.json();
      const itemId = listData?.items?.[0]?.id;

      if (!itemId) {
        // Zaten listede yok — başarılı say
        return NextResponse.json({ success: true, notFound: true });
      }

      // Sil
      const deleteRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?id=${itemId}`,
        { method: "DELETE", headers: authHeaders }
      );

      if (deleteRes.status === 204) {
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { error: "Silme işlemi başarısız." },
        { status: deleteRes.status }
      );

    } else {
      return NextResponse.json(
        { error: "action 'add' veya 'remove' olmalıdır." },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("YouTube watch-later route error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
