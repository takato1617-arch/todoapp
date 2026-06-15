import { createHmac } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "todo_session";

// 合言葉から、推測されにくいセッショントークンを作る。
// クッキーには合言葉そのものではなくこのトークンを入れる（httpOnlyでJSからも読めない）。
function sessionToken() {
  const passphrase = process.env.APP_PASSPHRASE || "";
  const secret = process.env.APP_SESSION_SECRET || "fallback-secret";
  return createHmac("sha256", secret).update(passphrase).digest("hex");
}

// 合言葉が正しいか
export function checkPassphrase(input) {
  const expected = process.env.APP_PASSPHRASE || "";
  return !!expected && input === expected;
}

// ログイン成功時にクッキーへ入れる値
export function makeSessionValue() {
  return sessionToken();
}

// リクエストが認証済みか（クッキーのトークンが一致するか）
export function isAuthenticated() {
  const value = cookies().get(SESSION_COOKIE)?.value;
  return !!value && value === sessionToken();
}
