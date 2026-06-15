import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { isAuthenticated } from "@/lib/auth";

// 並び替え: 受け取ったID配列（上→下の順）どおりに position を 0,1,2,... と振り直す
export async function POST(request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }
  const { ids } = await request.json().catch(() => ({}));
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "並び順が空です" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("todos").update({ position: index }).eq("id", id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
