import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

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

  return createClient(url, anonKey);
}
