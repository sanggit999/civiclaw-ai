import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase Server Client chưa được cấu hình' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('unresolved_queries')
    .select('*')
    .order('hit_count', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const domainMap: Record<string, string> = {
    HOUSING: 'Nhà ở',
    TRAFFIC: 'Giao thông',
    LABOR: 'Lao động',
    SOCIAL_INSURANCE: 'Bảo hiểm xã hội',
    CIVIL: 'Dân sự',
  };

  const formatted = (data || []).map((row) => ({
    id: String(row.id),
    query_text: row.query_text,
    domain: domainMap[row.domain_guess] || row.domain_guess || 'Chưa phân loại',
    hit_count: row.hit_count,
    status: row.status,
    created_at: row.created_at,
  }));

  return NextResponse.json(formatted);
}

export async function PATCH(request: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase Server Client chưa được cấu hình' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Thiếu id hoặc status' }, { status: 400 });
    }

    const { error } = await supabase
      .from('unresolved_queries')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', Number(id));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id, status });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Dữ liệu không hợp lệ' }, { status: 400 });
  }
}
