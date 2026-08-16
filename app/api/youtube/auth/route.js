import { NextResponse } from "next/server";

/**
 * GET /api/youtube/auth
 * Kullanıcıyı Google OAuth consent sayfasına yönlendirir.
 */
export async function GET(request) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "YOUTUBE_CLIENT_ID tanımlı değil." },
      { status: 500 }
    );
  }

  // Vercel / Production veya Localhost ortamına göre kök adresi belirle
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

  const redirectUri = `${siteUrl}/api/youtube/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.force-ssl",
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
