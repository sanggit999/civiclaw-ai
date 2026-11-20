import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase Server Client chưa được cấu hình' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('system_configs')
    .select('*')
    .order('key', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (data || []).map((row) => ({
    key: row.key,
    value: row.value,
    description: row.description,
    updated_at: row.updated_at,
  }));

  return NextResponse.json(formatted);
}

export async function PUT(request: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase Server Client chưa được cấu hình' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Thiếu key hoặc value' }, { status: 400 });
    }

    const { error } = await supabase
      .from('system_configs')
      .update({
        value,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, key, value });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Dữ liệu không hợp lệ' }, { status: 400 });
  }
}
