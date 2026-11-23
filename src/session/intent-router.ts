/**
 * Bộ phân luồng Ý định Người dùng (User Intent Router)
 * 
 * Nhiệm vụ:
 * 1. Nhận diện các ý định Chào hỏi / Xã giao (Greeting / Chitchat): "Xin chào", "Hello", "Cảm ơn"...
 * 2. Phản hồi tức thì, thân thiện và tự nhiên (< 1ms), KHÔNG tra cứu luật và KHÔNG ghi rác vào Triage Hub.
 * 3. Hướng dẫn công dân đặt câu hỏi đúng phạm vi 5 bộ luật chính thống.
 * 
 * Tuân thủ triết lý Ponytail: Tối giản, không gọi LLM tốn token cho các câu chào hỏi đơn giản.
 */

export type UserIntent = 'GREETING' | 'THANKS' | 'BOT_IDENTITY' | 'LEGAL_QUERY';

export interface IntentRouteResult {
  intent: UserIntent;
  directAnswer?: string;
}

export const GREETING_RESPONSE = `👋 **Xin chào Bạn!** Tôi là **CivicLaw AI** - Trợ lý pháp lý thông minh và minh bạch của Việt Nam.

Tôi sẵn sàng hỗ trợ Bạn giải đáp các thắc mắc về quy định pháp luật trong 5 lĩnh vực cốt lõi:
- 🚦 **Giao thông đường bộ:** Mức xử phạt vi phạm, trừ điểm GPLX theo Nghị định 168/2024/NĐ-CP & Luật TTATGTĐB 2024.
- 👷 **Lao động & Việc làm:** Hợp đồng lao động, thử việc, tiền lương, chế độ sa thải theo Bộ luật Lao động 2019.
- 🏥 **Bảo hiểm xã hội:** Điều kiện rút BHXH 1 lần, chế độ thai sản, ốm đau, hưu trí theo Luật BHXH.
- 🏠 **Nhà ở & Chung cư:** Quy chế quản lý chung cư, quyền sở hữu, hợp đồng thuê nhà theo Luật Nhà ở 2023.
- ⚖️ **Hợp đồng & Dân sự:** Đặt cọc, quyền và nghĩa vụ hợp đồng theo Bộ luật Dân sự 2015.

Bạn đang có câu hỏi hoặc tình huống pháp lý nào cần hỗ trợ tra cứu?`;

export const THANKS_RESPONSE = `Rất vui được hỗ trợ Bạn! Nếu Bạn có thêm bất kỳ câu hỏi nào về các quy định pháp luật, đừng ngần ngại gửi tin nhắn cho tôi nhé. Chúc Bạn một ngày an lành và vạn sự như ý!`;

export const BOT_IDENTITY_RESPONSE = `Tôi là **CivicLaw AI** - Trợ lý pháp lý số phát triển nhằm hỗ trợ công dân và cơ quan quản lý tra cứu pháp luật một cách minh bạch, chính xác tuyệt đối và 100% trích dẫn căn cứ chính thống từ các văn bản quy phạm pháp luật Việt Nam.`;

/**
 * Các mẫu câu tiếng Việt nhận diện chào hỏi
 */
const GREETING_PATTERNS = [
  /^(xin\s+chào|chào|hello|hi|alo|hé\s+lô|kính\s+chào)(\s+(bạn|ad|bot|em|anh|chị|mọi\s+người|buổi\s+(sáng|trưa|chiều|tối)))*[\s!.,?~]*$/i,
];

/**
 * Các mẫu câu tiếng Việt nhận diện cảm ơn / tạm biệt
 */
const THANKS_PATTERNS = [
  /^(cảm\s+ơn|cám\s+ơn|thank\s+you|thanks|tạm\s+biệt|bye|goodbye)(\s+(bạn|ad|bot|nhiều|nhé|nha))*[\s!.,?~]*$/i,
];

/**
 * Các mẫu câu hỏi về danh tính của Bot
 */
const IDENTITY_PATTERNS = [
  /^(bạn\s+là\s+ai|bạn\s+tên\s+gì|giới\s+thiệu\s+(về\s+)?(bạn|mình)|civiclaw(\s+ai)?\s+là\s+gì)[\s!.,?~]*$/i,
];

/**
 * Phân loại ý định của người dùng và trả về câu trả lời trực tiếp nếu là xã giao
 */
export function classifyIntent(queryText: string): IntentRouteResult {
  const trimmed = (queryText || '').trim();

  // 1. Kiểm tra Chào hỏi
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        intent: 'GREETING',
        directAnswer: GREETING_RESPONSE,
      };
    }
  }

  // 2. Kiểm tra Cảm ơn / Tạm biệt
  for (const pattern of THANKS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        intent: 'THANKS',
        directAnswer: THANKS_RESPONSE,
      };
    }
  }

  // 3. Kiểm tra Giới thiệu bản thân
  for (const pattern of IDENTITY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        intent: 'BOT_IDENTITY',
        directAnswer: BOT_IDENTITY_RESPONSE,
      };
    }
  }

  // 4. Mặc định: Câu hỏi pháp lý cần truy xuất văn bản luật
  return {
    intent: 'LEGAL_QUERY',
  };
}
