import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAnonClient: SupabaseClient | null = null;
let cachedServiceClient: SupabaseClient | null = null;

export interface SupabaseConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
}

/**
 * Lấy Supabase Client singleton.
 * @param useServiceRole Nếu true, dùng SERVICE_ROLE_KEY (đầy đủ quyền admin, chỉ chạy ở backend).
 *                       Nếu false, dùng ANON_KEY (tuân thủ Row Level Security).
 */
export function getSupabaseClient(
  useServiceRole = false,
  customConfig?: SupabaseConfig
): SupabaseClient {
  const url = customConfig && customConfig.supabaseUrl !== undefined
    ? customConfig.supabaseUrl
    : process.env.SUPABASE_URL;

  const anonKey = customConfig && customConfig.supabaseAnonKey !== undefined
    ? customConfig.supabaseAnonKey
    : process.env.SUPABASE_ANON_KEY;

  const serviceKey = customConfig && customConfig.supabaseServiceRoleKey !== undefined
    ? customConfig.supabaseServiceRoleKey
    : process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      '⚠️ Thiếu biến môi trường SUPABASE_URL!\n' +
      'Vui lòng tạo project trên https://supabase.com và điền SUPABASE_URL vào file .env.'
    );
  }

  const apiKey = useServiceRole ? (serviceKey || anonKey) : (anonKey || serviceKey);

  if (!apiKey) {
    throw new Error(
      `⚠️ Thiếu API Key Supabase (${useServiceRole ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY'})!\n` +
      'Vui lòng kiểm tra file .env hoặc cấu hình project trên Supabase Dashboard.'
    );
  }

  if (useServiceRole) {
    if (!cachedServiceClient || customConfig) {
      cachedServiceClient = createClient(url, apiKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return cachedServiceClient;
  } else {
    if (!cachedAnonClient || customConfig) {
      cachedAnonClient = createClient(url, apiKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return cachedAnonClient;
  }
}

/**
 * Đặt lại cache client (phục vụ unit test)
 */
export function resetSupabaseClientCache(): void {
  cachedAnonClient = null;
  cachedServiceClient = null;
}
