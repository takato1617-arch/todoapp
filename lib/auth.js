import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "todo_session";

function sessionSecret() {
  return process.env.APP_SESSION_SECRET || "fallback-secret";
}

// ----- パスワードのハッシュ化 -----
// salt:hash 形式（どちらもhex）で保存する。平文は保存しない。
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// 入力パスワードが保存済みハッシュと一致するか（タイミング安全比較）
export function verifyPassword(password, stored) {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

// ----- セッション（誰としてログインしているか） -----
// クッキーには「userId.署名」を入れる。署名でなりすましを防ぐ（httpOnly）。
function sign(userId) {
  return createHmac("sha256", sessionSecret()).update(userId).digest("hex");
}

export function makeSessionValue(userId) {
  return `${userId}.${sign(userId)}`;
}

// クッキーから現在のユーザーIDを取り出す。無効・未ログインなら null。
export function getCurrentUserId() {
  const value = cookies().get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = value.slice(0, idx);
  const signature = value.slice(idx + 1);
  if (signature !== sign(userId)) return null;
  return userId;
}

// ----- 新規登録の招待合言葉 -----
// 誰でも勝手に登録できないよう、登録時だけ共通の合言葉を要求する。
// APP_PASSPHRASE が未設定なら招待チェック無し（誰でも登録可）。
export function isInviteRequired() {
  return !!(process.env.APP_PASSPHRASE || "");
}

export function checkInviteCode(input) {
  const expected = process.env.APP_PASSPHRASE || "";
  if (!expected) return true; // 未設定なら誰でも登録可
  return input === expected;
}
