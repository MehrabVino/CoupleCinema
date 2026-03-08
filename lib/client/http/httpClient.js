"use client";

export function createHttpClient({ baseUrl = "", tokenProvider }) {
  return {
    async request(path, options = {}) {
      const token = tokenProvider?.get?.() || "";
      const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Request failed");
      return json;
    }
  };
}

