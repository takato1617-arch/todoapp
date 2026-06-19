import { NextResponse } from "next/server";
import { getCurrentUserId, isInviteRequired } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
  const userId = getCurrentUserId();
  if (!userId) {
    return NextResponse.json({
      authenticated: false,
      inviteRequired: isInviteRequired(),
    });
  }

  // ヘッダー表示用にユーザー名も返す
  const { data: user } = await getSupabaseAdmin()
    .from("users")
    .select("name")
    .eq("id", userId)
    .maybeSingle();

  // ユーザーが消えている等で見つからなければ未認証扱い
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      inviteRequired: isInviteRequired(),
    });
  }

  return NextResponse.json({ authenticated: true, name: user.name });
}
