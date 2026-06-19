import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { getCurrentUserId } from "@/lib/auth";

function toClient(row) {
  return {
    value: row.value,
    label: row.label,
    bg: row.bg,
    text: row.text,
    isDefault: row.is_default,
    parent: row.parent ?? null,
  };
}

// 一覧取得（作成順）
export async function GET() {
  const userId = getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .select("*")
    .eq("owner", userId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(toClient));
}

// 新規作成
export async function POST(request) {
  const userId = getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const label = (body.label || "").trim();
  if (!label) {
    return NextResponse.json({ error: "カテゴリ名が空です" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 同名チェック（自分のカテゴリの中で）
  const { data: existing } = await supabase
    .from("categories")
    .select("value")
    .eq("owner", userId)
    .eq("label", label)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "同じ名前のカテゴリが既にあります" },
      { status: 409 }
    );
  }

  // 親カテゴリの検証（指定時）。階層は2段までに制限するため、
  // 親に指定できるのは最上位カテゴリ（parent が無い）のみ。
  let parent = body.parent || null;
  if (parent) {
    const { data: parentRow } = await supabase
      .from("categories")
      .select("value, parent")
      .eq("value", parent)
      .eq("owner", userId)
      .maybeSingle();
    if (!parentRow) {
      return NextResponse.json(
        { error: "指定された親カテゴリが見つかりません" },
        { status: 400 }
      );
    }
    if (parentRow.parent) {
      return NextResponse.json(
        { error: "サブカテゴリの下にさらにカテゴリは作れません" },
        { status: 400 }
      );
    }
  }

  const insertRow = {
    value: randomUUID(),
    label,
    bg: body.bg || "#e5e7eb",
    text: body.text || "#4b5563",
    is_default: false,
    owner: userId,
  };
  // parent はマイグレーション適用後にのみ存在する列なので、
  // 指定があるときだけ含める（未適用環境でも最上位カテゴリは作れる）。
  if (parent) insertRow.parent = parent;

  const { data, error } = await supabase
    .from("categories")
    .insert(insertRow)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toClient(data), { status: 201 });
}
