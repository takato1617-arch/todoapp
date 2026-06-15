import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { isAuthenticated } from "@/lib/auth";

function toClient(row) {
  return {
    value: row.value,
    label: row.label,
    bg: row.bg,
    text: row.text,
    isDefault: row.is_default,
  };
}

// 一覧取得（作成順）
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(toClient));
}

// 新規作成
export async function POST(request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const label = (body.label || "").trim();
  if (!label) {
    return NextResponse.json({ error: "カテゴリ名が空です" }, { status: 400 });
  }

  // 同名チェック
  const { data: existing } = await getSupabaseAdmin()
    .from("categories")
    .select("value")
    .eq("label", label)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "同じ名前のカテゴリが既にあります" },
      { status: 409 }
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .insert({
      value: randomUUID(),
      label,
      bg: body.bg || "#e5e7eb",
      text: body.text || "#4b5563",
      is_default: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toClient(data), { status: 201 });
}
