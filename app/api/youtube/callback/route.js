import { NextResponse } from "next/server";

/**
 * GET /api/youtube/callback?code=xxx
 * Google'dan gelen authorization code'u access_token + refresh_token'a çevirir.
 * Sonucu client-side'a aktarmak için query param ile ana sayfaya redirect eder.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

  // Kullanıcı izin vermedi
  if (error || !code) {
    return NextResponse.redirect(`${siteUrl}/?yt_auth=denied`);
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = `${siteUrl}/api/youtube/callback`;

  try {
    // Code'u token'a çevir
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      const errMsg = encodeURIComponent(tokenData.error_description || tokenData.error || "token_exchange_failed");
      return NextResponse.redirect(`${siteUrl}/?yt_auth=error&yt_err_msg=${errMsg}`);
    }

    // Token bilgilerini URL param olarak ana sayfaya gönder
    // (client-side localStorage'a kaydedecek)
    const params = new URLSearchParams({
      yt_auth: "success",
      yt_access_token: tokenData.access_token,
      yt_refresh_token: tokenData.refresh_token || "",
      yt_expires_in: tokenData.expires_in?.toString() || "3600",
    });

    return NextResponse.redirect(`${siteUrl}/?${params.toString()}`);
  } catch (err) {
    console.error("YouTube OAuth callback error:", err);
    return NextResponse.redirect(`${siteUrl}/?yt_auth=error`);
  }
}
