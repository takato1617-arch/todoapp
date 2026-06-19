import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { getCurrentUserId } from "@/lib/auth";

// カテゴリ削除（既定カテゴリは削除不可）
export async function DELETE(request, { params }) {
  const userId = getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const { data: cat } = await getSupabaseAdmin()
    .from("categories")
    .select("is_default")
    .eq("value", params.value)
    .eq("owner", userId)
    .maybeSingle();

  if (!cat) {
    return NextResponse.json(
      { error: "対象が見つかりません" },
      { status: 404 }
    );
  }
  if (cat.is_default) {
    return NextResponse.json(
      { error: "既定カテゴリは削除できません" },
      { status: 400 }
    );
  }

  const { error } = await getSupabaseAdmin()
    .from("categories")
    .delete()
    .eq("value", params.value)
    .eq("owner", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
