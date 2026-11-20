import 'dotenv/config';
import { GeminiLlmProvider } from '../dist/rag/gemini-llm-provider.js';

async function testGemini() {
  console.log('--- KIỂM TRA KẾT NỐI GEMINI API ---');
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('LỖI: GEMINI_API_KEY chưa được đặt trong .env');
    return;
  }

  console.log(`Đã nạp GEMINI_API_KEY: ${key.slice(0, 6)}...${key.slice(-4)}`);
  const provider = new GeminiLlmProvider({ apiKey: key, modelName: 'gemini-3.8-flash' });

  try {
    console.log('\nĐang gọi ListModels để kiểm tra danh sách models được hỗ trợ...');
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const listData = await listRes.json();
    if (listData.models) {
      console.log('Các models khả dụng:');
      const supported = listData.models
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name);
      console.log(supported);
    } else {
      console.log('ListModels Response:', listData);
    }
  } catch (e) {
    console.error('ListModels error:', e.message);
  }

  try {
    const res = await provider.generate('Xin chào, bạn là ai?');
    console.log('\n✅ KẾT QUẢ PHẢN HỒI THÀNH CÔNG:');
    console.log(res.text);
    console.log('\nTokens đã dùng:', res.tokensUsed);
  } catch (err) {
    console.error('\n❌ KẾT QUẢ GỌI API THẤT BẠI:');
    console.error(err.message);
  }
}

testGemini();
