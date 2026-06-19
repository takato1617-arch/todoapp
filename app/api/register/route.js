import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import {
  hashPassword,
  makeSessionValue,
  checkInviteCode,
  SESSION_COOKIE,
} from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/defaults";

export async function POST(request) {
  const { name, password, invite } = await request.json().catch(() => ({}));
  const trimmedName = (name || "").trim();

  if (!checkInviteCode(invite)) {
    return NextResponse.json({ error: "招待合言葉が違います" }, { status: 401 });
  }
  if (trimmedName.length < 1) {
    return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
  }
  if ((password || "").length < 4) {
    return NextResponse.json(
      { error: "パスワードは4文字以上にしてください" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // 名前の重複チェック
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("name", trimmedName)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "この名前は既に使われています" },
      { status: 409 }
    );
  }

  // ユーザー作成
  const { data: user, error } = await supabase
    .from("users")
    .insert({ name: trimmedName, password_hash: hashPassword(password) })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // このユーザー専用の既定カテゴリを作成
  const { error: catError } = await supabase.from("categories").insert(
    DEFAULT_CATEGORIES.map((c) => ({
      value: randomUUID(),
      label: c.label,
      bg: c.bg,
      text: c.text,
      is_default: true,
      owner: user.id,
    }))
  );
  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, name: trimmedName }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, makeSessionValue(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });
  return res;
}
