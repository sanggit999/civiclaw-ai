import { LegalChunk } from '../ingestion/types.js';
import { buildPersonaStyleInstruction, ConversationPersona } from '../session/persona.js';
import { RagPipelineConfig } from './types.js';

export interface ConversationalPromptContext {
  persona?: ConversationPersona;
  rawUserQuery?: string;
  history?: Array<{ role: string; content: string }>;
}

/**
 * Cấu hình mặc định cho luồng RAG pháp lý (Anti-Hardcode)
 */
export const DEFAULT_RAG_CONFIG: RagPipelineConfig = {
  defaultTopK: 5,
  defaultConfidenceThreshold: 0.65,
  maxContextLengthChars: 8000,
  systemPrompt: `Bạn là CivicLaw AI - Trợ lý pháp lý thông minh, gần gũi và minh bạch của Việt Nam.
Nhiệm vụ của bạn là giải đáp thắc mắc pháp luật một cách tự nhiên, dễ hiểu dựa trên các văn bản quy phạm pháp luật được cung cấp.

QUY TẮC BẮT BUỘC (NON-NEGOTIABLE RULES):
1. 100% CĂN CỨ VÀ TRÍCH DẪN: Mọi nhận định, mức phạt, hay nghĩa vụ pháp lý phải được trích dẫn đích danh [Điểm... Khoản... Điều... Số hiệu văn bản quy phạm pháp luật...].
2. TUYỆT ĐỐI KHÔNG ẢO GIÁC: Chỉ sử dụng các thông tin và điều luật có trong phần "NGỮ CẢNH PHÁP LUẬT" bên dưới. Tuyệt đối không tự suy đoán, bịa đặt số tiền phạt hoặc trích dẫn văn bản không có trong ngữ cảnh.
3. PHONG CÁCH TRẢ LỜI TỰ NHIÊN: Trò chuyện rõ ràng, đi thẳng vào câu trả lời chính trước rồi giải thích ngắn gọn điều kiện/mức phạt bổ sung (nếu có), trình bày tự nhiên như đang tư vấn trực tiếp và kết thúc bằng 1 gợi ý nhẹ nhàng nếu người dùng muốn hỏi sâu thêm hoặc chuyển ý khác.`,
  fallbackMessage: `⚠️ THÔNG BÁO VỀ CĂN CỨ PHÁP LÝ:
Hiện tại CivicLaw AI chưa có dữ liệu chính thức về vấn đề Bạn hỏi trong các bộ luật cốt lõi hiện có.
Để bảo đảm tính chính xác tuyệt đối và tránh cung cấp thông tin sai lệch, hệ thống đã ghi nhận câu hỏi của Bạn vào Hàng đợi tri thức để Quản trị viên cập nhật văn bản quy phạm pháp luật tương ứng.`,
  extractiveFallbackNotice: `⚠️ THÔNG BÁO TỰ ĐỘNG:
Hệ thống xử lý ngôn ngữ tự nhiên đang tạm thời gián đoạn (quá tải hạn mức hoặc bảo trì kết nối AI).
Để không làm gián đoạn việc tra cứu, CivicLaw AI đã tự động chuyển sang chế độ TRÍCH XUẤT NGUYÊN VĂN TỪ CƠ SỞ DỮ LIỆU PHÁP LUẬT CHÍNH THỨC:`,
  maintenanceMessage: `🔧 THÔNG BÁO VẬN HÀNH HỆ THỐNG:
Hệ thống Trợ lý Pháp lý CivicLaw AI hiện đang trong phiên bảo trì định kỳ để tối ưu hóa và cập nhật dữ liệu quy phạm pháp luật mới nhất.

Quý công dân vui lòng thử lại sau ít phút hoặc tạo phiên hội thoại mới. Xin chân thành cảm ơn sự thông cảm của Quý vị!`,
};

export const DEFAULT_MAINTENANCE_MESSAGE = DEFAULT_RAG_CONFIG.maintenanceMessage!;

/**
 * Định dạng danh sách chunks thành văn bản ngữ cảnh rõ ràng kèm trích dẫn
 */
export function formatContextChunks(
  chunks: LegalChunk[],
  maxLength: number = DEFAULT_RAG_CONFIG.maxContextLengthChars
): string {
  if (!chunks || chunks.length === 0) return '';

  const formattedBlocks: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const block = `[NGUỒN THAM KHẢO ${i + 1}]: ${chunk.fullReference}\n${chunk.content}\n`;

    if (currentLength + block.length > maxLength) {
      // Nếu là khối đầu tiên mà đã vượt quá maxLength, cắt ngắn nội dung để bảo đảm vẫn có ngữ cảnh
      if (formattedBlocks.length === 0) {
        const maxContentLen = Math.max(50, maxLength - chunk.fullReference.length - 60);
        const truncated = chunk.content.substring(0, maxContentLen);
        formattedBlocks.push(`[NGUỒN THAM KHẢO 1]: ${chunk.fullReference}\n${truncated}...\n`);
      }
      break;
    }

    formattedBlocks.push(block);
    currentLength += block.length;
  }

  return formattedBlocks.join('\n---\n');
}

/**
 * Xây dựng prompt hoàn chỉnh gửi tới LLM Provider
 */
export function buildGroundedPrompt(
  query: string,
  chunks: LegalChunk[],
  config?: Partial<RagPipelineConfig>,
  conversationalCtx?: ConversationalPromptContext
): { prompt: string; systemInstruction: string } {
  const mergedConfig = { ...DEFAULT_RAG_CONFIG, ...config };
  const contextText = formatContextChunks(chunks, mergedConfig.maxContextLengthChars);

  let systemInstruction = mergedConfig.systemPrompt;
  if (conversationalCtx?.persona) {
    systemInstruction += buildPersonaStyleInstruction(
      conversationalCtx.persona,
      conversationalCtx.history
    );
  }

  const displayQuestion = (conversationalCtx?.rawUserQuery || query).trim();
  const normalizedBlock =
    conversationalCtx?.rawUserQuery && conversationalCtx.rawUserQuery.trim() !== query.trim()
      ? `\nTRUY VẤN PHÁP LÝ ĐÃ CHUẨN HÓA:\n${query}\n`
      : '';

  const prompt = `--- BẮT ĐẦU NGỮ CẢNH PHÁP LUẬT ---
${contextText}
--- KẾT THÚC NGỮ CẢNH PHÁP LUẬT ---

CÂU HỎI CỦA NGƯỜI DÙNG:
${displayQuestion}
${normalizedBlock}
Hãy trả lời câu hỏi trên tự nhiên, thân thiện và đúng các quy tắc trích dẫn bắt buộc đã được hướng dẫn.`;

  return {
    prompt,
    systemInstruction,
  };
}

/**
 * Tạo câu trả lời trích xuất trực tiếp từ Context Chunks trong Database khi LLM gặp sự cố
 * Bảo đảm 100% căn cứ thực tế, 0% ảo giác, không phụ thuộc LLM bên thứ 3
 */
export function buildExtractiveFallbackAnswer(
  chunks: LegalChunk[],
  notice: string = DEFAULT_RAG_CONFIG.extractiveFallbackNotice
): string {
  if (!chunks || chunks.length === 0) {
    return DEFAULT_RAG_CONFIG.fallbackMessage;
  }

  const sections: string[] = [notice, '\n📚 CĂN CỨ PHÁP LÝ TÌM THẤY TRONG HỆ THỐNG:\n'];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    sections.push(`${i + 1}. [${chunk.fullReference}]\nNội dung: "${chunk.content.trim()}"\n`);
  }

  sections.push(
    '💡 Bạn có thể đối chiếu trực tiếp các điều khoản nguyên văn ở trên để áp dụng vào trường hợp của mình một cách hoàn toàn chính xác.'
  );

  return sections.join('\n');
}
