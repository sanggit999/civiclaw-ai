import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const DEFAULT_GATEWAY_URL = 'http://localhost:3001';
const CONFIG_RELOAD_TIMEOUT_MS = 2000;

function resolveGatewayReloadUrl(): string | null {
  const rawBase =
    process.env.GATEWAY_URL ||
    process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_URL ||
    DEFAULT_GATEWAY_URL;
  try {
    const url = new URL('/api/v1/search/reload-config', rawBase);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

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

    // Best-effort hot-reload cấu hình trên Gateway nếu đang chạy
    const reloadUrl = resolveGatewayReloadUrl();
    if (reloadUrl) {
      const headers: Record<string, string> = {};
      if (process.env.GATEWAY_ADMIN_SECRET) {
        headers['x-admin-token'] = process.env.GATEWAY_ADMIN_SECRET;
      }
      try {
        await fetch(reloadUrl, {
          method: 'POST',
          headers,
          signal: AbortSignal.timeout(CONFIG_RELOAD_TIMEOUT_MS),
        });
      } catch {
        // Non-fatal nếu Gateway tạm thời chưa khởi động
      }
    }

    return NextResponse.json({ success: true, key, value });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Dữ liệu không hợp lệ' }, { status: 400 });
  }
}
