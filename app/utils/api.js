const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("tabflow_token");
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    cache: "no-store",
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Sunucu Hatası (${response.status}): Servise ulaşılamıyor.`);
      }
      data = { message: text };
    }

    if (!response.ok) {
      const errMsg = (data && (data.error || data.detail)) || 
        (typeof data === "object" ? Object.values(data).flat().join(" ") : null) || 
        "Bir hata oluştu.";
      throw new Error(errMsg);
    }
    return data;
  } catch (error) {
    console.error(`API Error in ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Authentication
  async register(email, password, username) {
    const data = await request("/auth/register/", {
      method: "POST",
      body: JSON.stringify({ email, password, username }),
    });
    if (data.token) {
      localStorage.setItem("tabflow_token", data.token);
      localStorage.setItem("tabflow_user", JSON.stringify(data.user));
    }
    return data;
  },

  async login(email, password) {
    const data = await request("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      localStorage.setItem("tabflow_token", data.token);
      localStorage.setItem("tabflow_user", JSON.stringify(data.user));
    }
    return data;
  },

  logout() {
    localStorage.removeItem("tabflow_token");
    localStorage.removeItem("tabflow_user");
  },

  getCurrentUser() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tabflow_user");
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  },

  /**
   * Gizli sekme unlock: mevcut oturumu bozmadan sadece şifre doğrular.
   * Returns true if password is correct, false otherwise.
   */
  async verifyPassword(password) {
    try {
      const data = await request("/auth/verify-password/", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      return data.valid === true;
    } catch {
      return false;
    }
  },

  // Links CRUD
  async getLinks() {
    return request("/links/");
  },

  async addLink(linkData) {
    const payload = {
      url: linkData.url,
      video_id: linkData.video_id || linkData.videoId || null,
      type: linkData.type || "general",
      title: linkData.title || "Untitled Link",
      source_name: linkData.source_name || linkData.author_name || "Unknown Source",
      is_clean: linkData.is_clean || linkData.is_watched || false,
      watched_at: linkData.watched_at || null,
      liked: linkData.liked || false,
      bookmarked: linkData.bookmarked || false,
      is_private: linkData.is_private || false,
      duration: linkData.duration || "0:00",
      metadata: linkData.metadata || {},
      curator: linkData.curator || "@feed_master",
      category: linkData.category || "Tech",
    };
    return request("/links/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateLink(id, fields) {
    const payload = {};
    if (fields.is_clean !== undefined) payload.is_clean = fields.is_clean;
    if (fields.is_watched !== undefined) payload.is_clean = fields.is_watched;
    if (fields.watched_at !== undefined) payload.watched_at = fields.watched_at;
    if (fields.liked !== undefined) payload.liked = fields.liked;
    if (fields.bookmarked !== undefined) payload.bookmarked = fields.bookmarked;
    if (fields.is_private !== undefined) payload.is_private = fields.is_private;
    if (fields.title !== undefined) payload.title = fields.title;
    if (fields.metadata !== undefined) payload.metadata = fields.metadata;

    return request(`/links/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteLink(id) {
    return request(`/links/${id}/`, {
      method: "DELETE",
    });
  },

  // Syncing
  async syncLinks(links) {
    // Standardize structure for backend before sending
    const formatted = links.map(v => ({
      url: v.url,
      video_id: v.video_id || v.videoId || null,
      type: v.type || "general",
      title: v.title,
      source_name: v.source_name || v.author_name,
      is_clean: v.is_clean || v.is_watched || false,
      watched_at: v.watched_at || null,
      liked: v.liked || false,
      bookmarked: v.bookmarked || false,
      is_private: v.is_private || false,
      duration: v.duration || "0:00",
      metadata: v.metadata || {},
      curator: v.curator || "@feed_master",
      category: v.category || "Tech"
    }));
    return request("/links/sync/", {
      method: "POST",
      body: JSON.stringify(formatted),
    });
  },
};
