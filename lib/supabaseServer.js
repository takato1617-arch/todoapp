import { createClient } from "@supabase/supabase-js";

// サーバー側専用のSupabaseクライアント（遅延初期化）。
// service_role キーはブラウザに出してはいけないので、必ずサーバー（API Route）でのみ使う。
let client = null;

export function getSupabaseAdmin() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local（またはVercelの環境変数）を確認してください。"
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
