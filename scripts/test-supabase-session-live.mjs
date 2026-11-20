import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SupabaseSessionStore } from '../dist/session/supabase-session-store.js';

async function testSupabaseSessionLive() {
  console.log('================================================================');
  console.log('☁️  KIỂM TRA KẾT NỐI SUPABASE CLOUD CHO CHAT SESSIONS & MESSAGES');
  console.log('================================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Lỗi: SUPABASE_URL hoặc SUPABASE_KEY chưa được đặt trong .env');
    return;
  }

  console.log(`📡 Đang kết nối tới Supabase: ${supabaseUrl}`);
  const client = createClient(supabaseUrl, supabaseKey);
  const store = new SupabaseSessionStore(client);

  try {
    // 1. Thử tạo mới một phiên
    console.log('1. Đang tạo phiên hội thoại mới trên bảng public.chat_sessions...');
    const session = await store.createSession('Phiên thử nghiệm Supabase Cloud Live');
    console.log(`✅ Tạo phiên thành công! ID: ${session.id}, Title: "${session.title}"`);

    // 2. Thử ghi tin nhắn User
    console.log('\n2. Đang ghi nhận tin nhắn User vào bảng public.chat_messages...');
    const userMsg = await store.appendMessage({
      sessionId: session.id,
      role: 'user',
      content: 'Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?',
    });
    console.log(`✅ Đã lưu tin nhắn User! ID: ${userMsg.id}`);

    // 3. Thử ghi tin nhắn Assistant kèm trích dẫn
    console.log('\n3. Đang ghi nhận tin nhắn Assistant vào bảng public.chat_messages...');
    const botMsg = await store.appendMessage({
      sessionId: session.id,
      role: 'assistant',
      content: 'Phạt tiền từ 400.000 đồng đến 600.000 đồng theo quy định.',
      citations: [
        {
          fullReference: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
          article: 'Điều 6',
          clause: 'Khoản 3',
          docNumber: '168/2024/NĐ-CP',
          isVerified: true,
        },
      ],
      isGrounded: true,
    });
    console.log(`✅ Đã lưu tin nhắn Assistant! ID: ${botMsg.id}`);

    // 4. Đọc lại lịch sử từ Supabase
    console.log('\n4. Đang truy vấn danh sách tin nhắn theo session_id...');
    const messages = await store.getRecentMessages(session.id, 5);
    console.log(`✅ Lấy thành công ${messages.length} tin nhắn từ Supabase Cloud:`);
    messages.forEach((m, idx) => {
      console.log(`   [${idx + 1}] (${m.role}): ${m.content} (isGrounded: ${m.isGrounded ?? false})`);
    });

    console.log('\n================================================================');
    console.log('🎉 TẤT CẢ THAO TÁC TRÊN SUPABASE CLOUD ĐÃ THÀNH CÔNG RỰC RỠ 100%!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Gặp lỗi khi thao tác với Supabase Cloud:');
    console.error(err.message);
    console.error('\n👉 Hãy chắc chắn Bạn đã chạy xong script SQL trên Supabase Studio SQL Editor!');
  }
}

testSupabaseSessionLive();
