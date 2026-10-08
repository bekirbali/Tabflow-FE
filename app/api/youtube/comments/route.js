import { NextResponse } from "next/server";

/**
 * GET /api/youtube/comments?videoId=XYZ
 * YouTube Data API v3 commentThreads kullanarak videonun en alakalı yorumlarını çeker.
 */
/**
 * GET /api/youtube/comments?videoId=XYZ
 * veya GET /api/youtube/comments?parentId=XYZ
 * - videoId verilirse videonun üst düzey yorumlarını ve varsa ilk yanıtlarını çeker.
 * - parentId verilirse o yoruma ait tüm alt yanıtları (replies) çeker.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    const parentId = searchParams.get("parentId");

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "YOUTUBE_API_KEY sunucuda tanımlanmamış." },
        { status: 500 }
      );
    }

    // ─── 1. Bir Yorumun Yanıtlarını (Replies) Çek ─────────────────────────────
    if (parentId) {
      const pageToken = searchParams.get("pageToken");
      let repliesUrl = `https://www.googleapis.com/youtube/v3/comments?part=snippet&parentId=${encodeURIComponent(
        parentId
      )}&maxResults=50&key=${apiKey}`;

      if (pageToken) {
        repliesUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const res = await fetch(repliesUrl, { cache: "no-store" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData?.error?.message || "Yanıtlar alınamadı." },
          { status: res.status }
        );
      }

      const data = await res.json();
      const replies = (data.items || []).map((reply) => {
        const repSnippet = reply.snippet || {};
        return {
          id: reply.id,
          parentId,
          authorDisplayName: repSnippet.authorDisplayName || "Kullanıcı",
          authorProfileImageUrl: repSnippet.authorProfileImageUrl || "",
          authorChannelUrl: repSnippet.authorChannelUrl || "",
          authorChannelId: repSnippet.authorChannelId?.value || "",
          textDisplay: repSnippet.textDisplay || "",
          textOriginal: repSnippet.textOriginal || "",
          likeCount: repSnippet.likeCount || 0,
          publishedAt: repSnippet.publishedAt || null,
        };
      });

      return NextResponse.json({
        success: true,
        parentId,
        replies,
        nextPageToken: data.nextPageToken || null,
      });
    }

    // ─── 2. Videonun Yorumlarını (Comment Threads) Çek ────────────────────────
    if (!videoId) {
      return NextResponse.json(
        { error: "videoId veya parentId parametresi gereklidir." },
        { status: 400 }
      );
    }

    const pageToken = searchParams.get("pageToken");

    let ytUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${encodeURIComponent(
      videoId
    )}&maxResults=25&order=relevance&key=${apiKey}`;

    if (pageToken) {
      ytUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    // İlk sayfa isteğinde videonun gerçek toplam yorum sayısını da paralel olarak al
    let totalCommentCountPromise = Promise.resolve(null);
    if (!pageToken) {
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(
        videoId
      )}&key=${apiKey}`;
      totalCommentCountPromise = fetch(statsUrl, { next: { revalidate: 300 } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const count = d?.items?.[0]?.statistics?.commentCount;
          return count !== undefined && count !== null ? Number(count) : null;
        })
        .catch(() => null);
    }

    const [res, totalCommentCount] = await Promise.all([
      fetch(ytUrl, { cache: "no-store" }),
      totalCommentCountPromise,
    ]);

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
      const rawReplies = item.replies?.comments || [];
      const replies = rawReplies.map((reply) => {
        const repSnippet = reply.snippet || {};
        return {
          id: reply.id,
          parentId: item.id,
          authorDisplayName: repSnippet.authorDisplayName || "Kullanıcı",
          authorProfileImageUrl: repSnippet.authorProfileImageUrl || "",
          authorChannelUrl: repSnippet.authorChannelUrl || "",
          authorChannelId: repSnippet.authorChannelId?.value || "",
          textDisplay: repSnippet.textDisplay || "",
          textOriginal: repSnippet.textOriginal || "",
          likeCount: repSnippet.likeCount || 0,
          publishedAt: repSnippet.publishedAt || null,
        };
      });

      return {
        id: item.id,
        authorDisplayName: topComment.authorDisplayName || "Kullanıcı",
        authorProfileImageUrl: topComment.authorProfileImageUrl || "",
        authorChannelUrl: topComment.authorChannelUrl || "",
        authorChannelId: topComment.authorChannelId?.value || "",
        textDisplay: topComment.textDisplay || "",
        textOriginal: topComment.textOriginal || "",
        likeCount: topComment.likeCount || 0,
        publishedAt: topComment.publishedAt || null,
        totalReplyCount: item.snippet?.totalReplyCount || 0,
        replies,
      };
    });

    return NextResponse.json({
      success: true,
      commentsCount: comments.length,
      totalCommentCount: totalCommentCount !== undefined ? totalCommentCount : null,
      nextPageToken: data?.nextPageToken || null,
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
 * Body: { videoId?: string, parentId?: string, text: string, accessToken: string }
 * - parentId varsa: comments.insert ile yoruma yanıt (reply) ekler.
 * - parentId yoksa: commentThreads.insert ile videoya yeni yorum ekler.
 */
export async function POST(request) {
  try {
    const { videoId, parentId, text, accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "YouTube oturumu bulunamadı. Lütfen YouTube hesabınızı bağlayın." },
        { status: 401 }
      );
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Yorum metni zorunludur." },
        { status: 400 }
      );
    }

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // ─── 1. Alt Yanıt Gönderme (Reply) ────────────────────────────────────────
    if (parentId) {
      const res = await fetch(
        "https://www.googleapis.com/youtube/v3/comments?part=snippet",
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            snippet: {
              parentId,
              textOriginal: text.trim(),
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
        const message = errorData?.error?.message || "Yanıt gönderilemedi.";
        return NextResponse.json({ error: message }, { status: res.status });
      }

      const data = await res.json();
      const repSnippet = data.snippet || {};

      return NextResponse.json({
        success: true,
        isReply: true,
        parentId,
        comment: {
          id: data.id,
          parentId,
          authorDisplayName: repSnippet.authorDisplayName || "Siz",
          authorProfileImageUrl: repSnippet.authorProfileImageUrl || "",
          authorChannelUrl: repSnippet.authorChannelUrl || "",
          authorChannelId: repSnippet.authorChannelId?.value || "",
          textDisplay: repSnippet.textDisplay || text.trim(),
          textOriginal: repSnippet.textOriginal || text.trim(),
          likeCount: 0,
          publishedAt: repSnippet.publishedAt || new Date().toISOString(),
        },
      });
    }

    // ─── 2. Yeni Video Yorumu Gönderme (Top Level Comment) ────────────────────
    if (!videoId) {
      return NextResponse.json(
        { error: "videoId ve yorum metni zorunludur." },
        { status: 400 }
      );
    }

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
        authorChannelId: topComment.authorChannelId?.value || "",
        textDisplay: topComment.textDisplay || text.trim(),
        textOriginal: topComment.textOriginal || text.trim(),
        likeCount: 0,
        publishedAt: topComment.publishedAt || new Date().toISOString(),
        totalReplyCount: 0,
        replies: [],
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

/**
 * DELETE /api/youtube/comments
 * Body: { commentId: string, accessToken: string }
 * YouTube Data API v3 comments.delete kullanarak yorum veya alt yanıtı siler.
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    let commentId = searchParams.get("commentId");
    let accessToken = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!commentId || !accessToken) {
      const body = await request.json().catch(() => ({}));
      commentId = commentId || body.commentId;
      accessToken = accessToken || body.accessToken;
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "YouTube oturumu bulunamadı." },
        { status: 401 }
      );
    }

    if (!commentId) {
      return NextResponse.json(
        { error: "commentId gereklidir." },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/comments?id=${encodeURIComponent(commentId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "TOKEN_EXPIRED", message: "YouTube yetkilendirme süresi doldu." },
        { status: 401 }
      );
    }

    if (!res.ok && res.status !== 204) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData?.error?.message || "Yorum silinemedi.";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    return NextResponse.json({ success: true, deletedId: commentId });
  } catch (err) {
    console.error("YouTube comments DELETE route error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}

