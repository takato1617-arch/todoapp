import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { isAuthenticated } from "@/lib/auth";

// DBの行（snake_case）をフロント用（camelCase）に変換
function toClient(row) {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed,
    priority: row.priority,
    category: row.category,
    dueDate: row.due_date ?? "",
    createdAt: row.created_at,
  };
}

// 一覧取得
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(toClient));
}

// 新規作成
export async function POST(request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const text = (body.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "本文が空です" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("todos")
    .insert({
      text,
      priority: body.priority || "medium",
      category: body.category || null,
      due_date: body.dueDate || null,
      completed: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toClient(data), { status: 201 });
}
