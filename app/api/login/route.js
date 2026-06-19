import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { verifyPassword, makeSessionValue, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request) {
  const { name, password } = await request.json().catch(() => ({}));
  const trimmedName = (name || "").trim();

  if (!trimmedName || !password) {
    return NextResponse.json(
      { error: "名前とパスワードを入力してください" },
      { status: 400 }
    );
  }

  const { data: user } = await getSupabaseAdmin()
    .from("users")
    .select("id, password_hash")
    .eq("name", trimmedName)
    .maybeSingle();

  // 名前が無い場合もパスワード違いと同じ文言にして、存在の有無を漏らさない
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { error: "名前またはパスワードが違います" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true, name: trimmedName });
  res.cookies.set(SESSION_COOKIE, makeSessionValue(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });
  return res;
}
