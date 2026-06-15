import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { isAuthenticated } from "@/lib/auth";

function toClient(row) {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed,
    priority: row.priority,
    category: row.category,
    dueDate: row.due_date ?? "",
    position: row.position,
    createdAt: row.created_at,
  };
}

// 更新（編集・完了切り替え）
export async function PATCH(request, { params }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));

  const patch = {};
  if (body.text !== undefined) patch.text = body.text;
  if (body.completed !== undefined) patch.completed = body.completed;
  if (body.priority !== undefined) patch.priority = body.priority;
  if (body.category !== undefined) patch.category = body.category;
  if (body.dueDate !== undefined) patch.due_date = body.dueDate || null;

  const { data, error } = await getSupabaseAdmin()
    .from("todos")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toClient(data));
}

// 削除
export async function DELETE(request, { params }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }
  const { error } = await getSupabaseAdmin()
    .from("todos")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
