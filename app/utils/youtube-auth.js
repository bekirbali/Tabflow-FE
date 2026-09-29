/**
 * youtube-auth.js
 * YouTube OAuth token yönetimi için client-side yardımcı fonksiyonlar.
 * Token'lar localStorage'da tutulur.
 */

const YT_ACCESS_TOKEN_KEY = "yt_access_token";
const YT_REFRESH_TOKEN_KEY = "yt_refresh_token";
const YT_EXPIRES_AT_KEY = "yt_expires_at";

// ─── Token Yönetimi ────────────────────────────────────────────────────────────

export function saveYouTubeTokens({ accessToken, refreshToken, expiresIn }) {
  if (typeof window === "undefined") return;
  const expiresAt = Date.now() + (parseInt(expiresIn, 10) - 60) * 1000; // 1 dk erken geçersiz say
  localStorage.setItem(YT_ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(YT_REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(YT_EXPIRES_AT_KEY, expiresAt.toString());
}

export function clearYouTubeTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(YT_ACCESS_TOKEN_KEY);
  localStorage.removeItem(YT_REFRESH_TOKEN_KEY);
  localStorage.removeItem(YT_EXPIRES_AT_KEY);
}

export function isYouTubeConnected() {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(YT_ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(YT_REFRESH_TOKEN_KEY);
  
  // Eğer hem access token hem refresh token yoksa bağlı değil
  if (!token && !refreshToken) return false;

  // Access token var ve süresi dolmadıysa doğrudan bağlıdır
  const expiresAt = localStorage.getItem(YT_EXPIRES_AT_KEY);
  if (token && expiresAt && Date.now() <= parseInt(expiresAt, 10)) {
    return true;
  }

  // Access token dolmuş ama elimizde refresh token varsa yine bağlı kabul et (isteğe bağlı otomatik yenilenecek)
  return !!refreshToken;
}

export function getYouTubeAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(YT_ACCESS_TOKEN_KEY);
}

export function getYouTubeRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(YT_REFRESH_TOKEN_KEY);
}

/**
 * Access token süresi dolmuşsa otomatik olarak refresh_token ile yeniler ve geçerli token döner.
 */
export async function getValidYouTubeAccessToken() {
  if (typeof window === "undefined") return null;
  
  const token = localStorage.getItem(YT_ACCESS_TOKEN_KEY);
  const expiresAt = localStorage.getItem(YT_EXPIRES_AT_KEY);
  
  // Eğer access token hâlâ geçerliyse direkt dön
  if (token && expiresAt && Date.now() <= parseInt(expiresAt, 10)) {
    return token;
  }

  // Süresi dolmuşsa refresh etmeyi dene
  const refreshToken = getYouTubeRefreshToken();
  if (refreshToken) {
    const newToken = await refreshYouTubeToken();
    if (newToken) return newToken;
  }

  return null;
}

// ─── Token Yenileme ────────────────────────────────────────────────────────────

export async function refreshYouTubeToken() {
  const refreshToken = getYouTubeRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch("/api/youtube/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearYouTubeTokens();
      return null;
    }

    const data = await res.json();
    saveYouTubeTokens({
      accessToken: data.access_token,
      refreshToken: refreshToken, // refresh token genellikle yenilenmez
      expiresIn: data.expires_in,
    });
    return data.access_token;
  } catch {
    clearYouTubeTokens();
    return null;
  }
}

// ─── YouTube API Çağrıları ─────────────────────────────────────────────────────

/**
 * YouTube'da bir videoyu beğen/beğeniyi kaldır.
 * @param {string} videoId
 * @param {"like"|"none"} rating
 * @returns {{ success: boolean, error?: string, needsReconnect?: boolean }}
 */
export async function rateVideoOnYouTube(videoId, rating) {
  const accessToken = await getValidYouTubeAccessToken();
  if (!accessToken) return { success: false, needsReconnect: true };

  try {
    const res = await fetch("/api/youtube/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, rating, accessToken }),
    });

    const data = await res.json();

    // Token süresi dolmuş — otomatik yenilemeyi dene
    if (res.status === 401 && data.error === "TOKEN_EXPIRED") {
      const newToken = await refreshYouTubeToken();
      if (!newToken) return { success: false, needsReconnect: true };

      // Tekrar dene
      const retryRes = await fetch("/api/youtube/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, rating, accessToken: newToken }),
      });
      const retryData = await retryRes.json();
      return retryData;
    }

    return data;
  } catch (err) {
    console.error("rateVideoOnYouTube error:", err);
    return { success: false, error: "Bağlantı hatası." };
  }
}

/**
 * YouTube "Daha Sonra İzle" listesine ekle/çıkar.
 * @param {string} videoId
 * @param {"add"|"remove"} action
 * @returns {{ success: boolean, error?: string, needsReconnect?: boolean }}
 */
export async function toggleWatchLater(videoId, action) {
  const accessToken = await getValidYouTubeAccessToken();
  if (!accessToken) return { success: false, needsReconnect: true };

  try {
    const res = await fetch("/api/youtube/watch-later", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, action, accessToken }),
    });

    const data = await res.json();

    // Token süresi dolmuş — otomatik yenilemeyi dene
    if (res.status === 401 && data.error === "TOKEN_EXPIRED") {
      const newToken = await refreshYouTubeToken();
      if (!newToken) return { success: false, needsReconnect: true };

      const retryRes = await fetch("/api/youtube/watch-later", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, action, accessToken: newToken }),
      });
      const retryData = await retryRes.json();
      return retryData;
    }

    return data;
  } catch (err) {
    console.error("toggleWatchLater error:", err);
    return { success: false, error: "Bağlantı hatası." };
  }
}

/**
 * YouTube kanalına abone ol / abonelikten çık.
 * @param {{ videoId?: string, channelId?: string, action?: "subscribe" | "unsubscribe" }} param0
 * @returns {Promise<{ success: boolean, subscribed?: boolean, alreadySubscribed?: boolean, channelTitle?: string, needsReconnect?: boolean, notConnected?: boolean, error?: string }>}
 */
export async function subscribeToYouTubeChannel({ videoId, channelId, action = "subscribe" }) {
  const accessToken = await getValidYouTubeAccessToken();
  if (!accessToken) return { success: false, notConnected: true, needsReconnect: true };

  try {
    const res = await fetch("/api/youtube/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, channelId, action, accessToken }),
    });

    const data = await res.json();

    // Token süresi dolmuşsa otomatik yenilemeyi dene
    if (res.status === 401 && data.error === "TOKEN_EXPIRED") {
      const newToken = await refreshYouTubeToken();
      if (!newToken) return { success: false, needsReconnect: true };

      const retryRes = await fetch("/api/youtube/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, channelId, action, accessToken: newToken }),
      });
      const retryData = await retryRes.json();
      return retryData;
    }

    return data;
  } catch (err) {
    console.error("subscribeToYouTubeChannel error:", err);
    return { success: false, error: "Bağlantı hatası." };
  }
}

/**
 * YouTube kanal abonelik durumunu kontrol et.
 * @param {{ videoId?: string, channelId?: string }} param0
 * @returns {Promise<{ success: boolean, subscribed?: boolean, channelTitle?: string, needsReconnect?: boolean }>}
 */
export async function checkYouTubeSubscriptionStatus({ videoId, channelId }) {
  const accessToken = await getValidYouTubeAccessToken();
  if (!accessToken) return { success: false, notConnected: true };

  try {
    const res = await fetch("/api/youtube/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, channelId, action: "status", accessToken }),
    });

    const data = await res.json();

    if (res.status === 401 && data.error === "TOKEN_EXPIRED") {
      const newToken = await refreshYouTubeToken();
      if (!newToken) return { success: false, needsReconnect: true };

      const retryRes = await fetch("/api/youtube/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, channelId, action: "status", accessToken: newToken }),
      });
      return await retryRes.json();
    }

    return data;
  } catch (err) {
    console.error("checkYouTubeSubscriptionStatus error:", err);
    return { success: false, error: "Bağlantı hatası." };
  }
}

/**
 * YouTube videosuna uzaktan yorum gönder.
 * @param {{ videoId: string, text: string }} param0
 * @returns {Promise<{ success: boolean, comment?: object, error?: string, needsReconnect?: boolean, notConnected?: boolean }>}
 */
export async function postCommentToYouTube({ videoId, text }) {
  const accessToken = await getValidYouTubeAccessToken();
  if (!accessToken) return { success: false, notConnected: true, needsReconnect: true };

  try {
    const res = await fetch("/api/youtube/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, text, accessToken }),
    });

    const data = await res.json();

    if (res.status === 401 && data.error === "TOKEN_EXPIRED") {
      const newToken = await refreshYouTubeToken();
      if (!newToken) return { success: false, needsReconnect: true };

      const retryRes = await fetch("/api/youtube/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, text, accessToken: newToken }),
      });
      return await retryRes.json();
    }

    return data;
  } catch (err) {
    console.error("postCommentToYouTube error:", err);
    return { success: false, error: "Bağlantı hatası." };
  }
}

