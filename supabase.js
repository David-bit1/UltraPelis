import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const AUTH_STORAGE_KEY = "ultrapelis-supabase-auth";

function readConfig(name) {
  const meta = document.querySelector(`meta[name="${name}"]`);
  return meta?.content?.trim() || "";
}

export function createSupabaseBrowserClient() {
  const url = readConfig("supabase-url");
  const anonKey = readConfig("supabase-anon-key");

  if (!url || url.includes("YOUR_PROJECT") || !anonKey || anonKey.includes("YOUR_SUPABASE")) {
    throw new Error("Configura supabase-url y supabase-anon-key en el HTML.");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storageKey: AUTH_STORAGE_KEY,
    },
  });
}

export function getAuthStorageKey() {
  return AUTH_STORAGE_KEY;
}

export function getAuthToken() {
  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) return "";

  try {
    const parsed = JSON.parse(rawValue);
    if (typeof parsed === "string") return parsed;
    if (parsed?.access_token) return parsed.access_token;
    if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
    if (parsed?.session?.access_token) return parsed.session.access_token;
  } catch {
    return rawValue;
  }

  return "";
}
