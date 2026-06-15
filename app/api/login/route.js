import { NextResponse } from "next/server";
import { checkPassphrase, makeSessionValue, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request) {
  const { passphrase } = await request.json().catch(() => ({}));

  if (!checkPassphrase(passphrase)) {
    return NextResponse.json({ error: "合言葉が違います" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, makeSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });
  return res;
}
