import { NextResponse } from "next/server";

/**
 * POST /api/youtube/subscribe
 * Body: {
 *   videoId?: string,
 *   channelId?: string,
 *   action: "subscribe" | "unsubscribe" | "status",
 *   subscriptionId?: string,
 *   accessToken: string
 * }
 * YouTube Data API v3 subscriptions endpoint'ini kullanarak kanala abone olur veya aboneliği kaldırır.
 */
export async function POST(request) {
  try {
    const { videoId, channelId: initialChannelId, action = "subscribe", subscriptionId: initialSubId, accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "accessToken gereklidir." },
        { status: 400 }
      );
    }

    if (!videoId && !initialChannelId) {
      return NextResponse.json(
        { error: "videoId veya channelId gereklidir." },
        { status: 400 }
      );
    }

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    let channelId = initialChannelId;
    let channelTitle = "";

    // Eğer channelId verilmemişse, videoId üzerinden kanal bilgilerini YouTube API ile al
    if (!channelId && videoId) {
      const videoRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`,
        { headers: authHeaders }
      );

      if (videoRes.status === 401) {
        return NextResponse.json(
          { error: "TOKEN_EXPIRED", message: "YouTube token süresi doldu." },
          { status: 401 }
        );
      }

      if (videoRes.ok) {
        const videoData = await videoRes.json();
        if (videoData.items && videoData.items.length > 0) {
          channelId = videoData.items[0].snippet?.channelId;
          channelTitle = videoData.items[0].snippet?.channelTitle || "";
        }
      }
    }

    if (!channelId) {
      return NextResponse.json(
        { error: "Kanal kimliği (channelId) belirlenemedi." },
        { status: 404 }
      );
    }

    // 1. Abonelik Durumu Kontrolü (status)
    if (action === "status") {
      const checkRes = await fetch(
        `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&forChannelId=${channelId}`,
        { headers: authHeaders }
      );

      if (checkRes.status === 401) {
        return NextResponse.json(
          { error: "TOKEN_EXPIRED", message: "YouTube token süresi doldu." },
          { status: 401 }
        );
      }

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const isSubscribed = checkData.items && checkData.items.length > 0;
        const subId = isSubscribed ? checkData.items[0].id : null;
        const resolvedTitle = channelTitle || (isSubscribed ? checkData.items[0].snippet?.title : "");

        return NextResponse.json({
          success: true,
          subscribed: isSubscribed,
          subscriptionId: subId,
          channelId,
          channelTitle: resolvedTitle,
        });
      }

      return NextResponse.json({
        success: true,
        subscribed: false,
        channelId,
        channelTitle,
      });
    }

    // 2. Kanala Abone Olma (subscribe)
    if (action === "subscribe") {
      // Önce mevcut abonelik kontrolü
      const checkRes = await fetch(
        `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&forChannelId=${channelId}`,
        { headers: authHeaders }
      );

      if (checkRes.status === 401) {
        return NextResponse.json(
          { error: "TOKEN_EXPIRED", message: "YouTube token süresi doldu." },
          { status: 401 }
        );
      }

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.items && checkData.items.length > 0) {
          return NextResponse.json({
            success: true,
            subscribed: true,
            alreadySubscribed: true,
            subscriptionId: checkData.items[0].id,
            channelId,
            channelTitle: channelTitle || checkData.items[0].snippet?.title || "",
          });
        }
      }

      // Abone ol
      const subRes = await fetch(
        "https://www.googleapis.com/youtube/v3/subscriptions?part=snippet",
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            snippet: {
              resourceId: {
                kind: "youtube#channel",
                channelId: channelId,
              },
            },
          }),
        }
      );

      if (subRes.status === 401) {
        return NextResponse.json(
          { error: "TOKEN_EXPIRED", message: "YouTube token süresi doldu." },
          { status: 401 }
        );
      }

      if (!subRes.ok) {
        const errData = await subRes.json().catch(() => ({}));
        const errMsg = errData?.error?.message || "";

        // Kanal zaten takip ediliyorsa veya subscriptionDuplicate hatası varsa
        if (errMsg.includes("subscriptionDuplicate") || errMsg.includes("already")) {
          return NextResponse.json({
            success: true,
            subscribed: true,
            alreadySubscribed: true,
            channelId,
            channelTitle,
          });
        }

        console.error("YouTube subscribe error:", errData);
        return NextResponse.json(
          { error: errMsg || "Kanala abone olunamadı." },
          { status: subRes.status }
        );
      }

      const subData = await subRes.json();
      return NextResponse.json({
        success: true,
        subscribed: true,
        subscriptionId: subData.id,
        channelId,
        channelTitle: channelTitle || subData.snippet?.title || "",
      });
    }

    // 3. Aboneliği Kaldırma (unsubscribe)
    if (action === "unsubscribe") {
      let subIdToDelete = initialSubId;

      // subId yoksa önce bulalım
      if (!subIdToDelete) {
        const checkRes = await fetch(
          `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&forChannelId=${channelId}`,
          { headers: authHeaders }
        );

        if (checkRes.status === 401) {
          return NextResponse.json(
            { error: "TOKEN_EXPIRED", message: "YouTube token süresi doldu." },
            { status: 401 }
          );
        }

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.items && checkData.items.length > 0) {
            subIdToDelete = checkData.items[0].id;
          }
        }
      }

      if (!subIdToDelete) {
        // Zaten abone değil
        return NextResponse.json({
          success: true,
          subscribed: false,
          channelId,
          channelTitle,
        });
      }

      const delRes = await fetch(
        `https://www.googleapis.com/youtube/v3/subscriptions?id=${subIdToDelete}`,
        {
          method: "DELETE",
          headers: authHeaders,
        }
      );

      if (delRes.status === 401) {
        return NextResponse.json(
          { error: "TOKEN_EXPIRED", message: "YouTube token süresi doldu." },
          { status: 401 }
        );
      }

      if (delRes.status === 204 || delRes.ok) {
        return NextResponse.json({
          success: true,
          subscribed: false,
          channelId,
          channelTitle,
        });
      }

      const errData = await delRes.json().catch(() => ({}));
      console.error("YouTube unsubscribe error:", errData);
      return NextResponse.json(
        { error: errData?.error?.message || "Abonelik iptal edilemedi." },
        { status: delRes.status }
      );
    }

    return NextResponse.json(
      { error: "Geçersiz action parametresi." },
      { status: 400 }
    );
  } catch (err) {
    console.error("YouTube subscribe route error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
