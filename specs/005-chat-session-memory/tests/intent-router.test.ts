import { describe, it, expect, vi } from 'vitest';
import { classifyIntent, GREETING_RESPONSE, THANKS_RESPONSE, BOT_IDENTITY_RESPONSE } from '../../../src/session/intent-router.js';
import { ContextualRagPipeline } from '../../../src/session/pipeline.js';
import { InMemorySessionStore } from '../../../src/session/in-memory-session-store.js';
import { RuleAndLlmQueryCondenser } from '../../../src/session/query-condenser.js';
import { DEFAULT_MAINTENANCE_MESSAGE } from '../../../src/rag/prompt-builder.js';
import { IRagPipeline } from '../../../src/rag/types.js';

describe('Intent Router & Maintenance UX Verification', () => {
  it('phải nhận diện chính xác các câu chào hỏi tự nhiên (Greeting Intent)', () => {
    const greetings = ['Xin chào', 'chào bạn', 'Hello', 'hi', 'Chào bot', 'chào buổi sáng!'];
    for (const g of greetings) {
      const res = classifyIntent(g);
      expect(res.intent).toBe('GREETING');
      expect(res.directAnswer).toBe(GREETING_RESPONSE);
    }
  });

  it('phải nhận diện chính xác các câu cảm ơn & tạm biệt (Thanks Intent)', () => {
    const thanks = ['Cảm ơn', 'cám ơn bạn nhiều', 'thank you', 'tạm biệt bot'];
    for (const t of thanks) {
      const res = classifyIntent(t);
      expect(res.intent).toBe('THANKS');
      expect(res.directAnswer).toBe(THANKS_RESPONSE);
    }
  });

  it('phải nhận diện câu hỏi về danh tính của Bot (Identity Intent)', () => {
    const identity = ['Bạn là ai?', 'giới thiệu về mình', 'CivicLaw là gì?'];
    for (const id of identity) {
      const res = classifyIntent(id);
      expect(res.intent).toBe('BOT_IDENTITY');
      expect(res.directAnswer).toBe(BOT_IDENTITY_RESPONSE);
    }
  });

  it('phải chuyển các câu hỏi pháp luật sang nhánh tra cứu RAG (Legal Query)', () => {
    const legalQueries = [
      'Vượt đèn đỏ xe máy bị xử phạt bao nhiêu tiền?',
      'Lương thử việc tối thiểu được nhận bao nhiêu?',
      'Rút BHXH 1 lần cần điều kiện gì?',
    ];
    for (const q of legalQueries) {
      const res = classifyIntent(q);
      expect(res.intent).toBe('LEGAL_QUERY');
      expect(res.directAnswer).toBeUndefined();
    }
  });

  it('ContextualRagPipeline phản hồi chào hỏi tự nhiên mà KHÔNG cần gọi RAG Core', async () => {
    const sessionStore = new InMemorySessionStore();
    const condenser = new RuleAndLlmQueryCondenser();
    const mockRagPipeline: IRagPipeline = {
      query: vi.fn(),
    };

    const pipeline = new ContextualRagPipeline(sessionStore, condenser, mockRagPipeline);
    const res = await pipeline.chat({ query: 'Xin chào bạn' });

    expect(res.answer).toContain('CivicLaw AI');
    expect(res.answer).toContain('Xin chào Bạn!');
    expect(res.isGrounded).toBe(true);
    expect(res.confidenceScore).toBe(1.0);
    expect(res.citations).toHaveLength(0);
    expect(mockRagPipeline.query).not.toHaveBeenCalled();

    // Tin nhắn chào hỏi được lưu vào lịch sử phiên
    const messages = await sessionStore.getRecentMessages(res.sessionId);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('Xin chào bạn');
    expect(messages[1].role).toBe('assistant');
  });

  it('ContextualRagPipeline trả về thông điệp Bảo trì UX văn minh khi RAG Core gặp sự cố', async () => {
    const sessionStore = new InMemorySessionStore();
    const condenser = new RuleAndLlmQueryCondenser();
    const failingRagPipeline: IRagPipeline = {
      query: vi.fn().mockRejectedValue(new Error('Network outage or Database connection failure')),
    };

    const pipeline = new ContextualRagPipeline(sessionStore, condenser, failingRagPipeline);
    const res = await pipeline.chat({ query: 'Lương thử việc tối thiểu?' });

    expect(res.answer).toBe(DEFAULT_MAINTENANCE_MESSAGE);
    expect(res.answer).toContain('THÔNG BÁO VẬN HÀNH HỆ THỐNG');
    expect(res.fallbackTriggered).toBe(true);
    expect(res.metadata?.systemState).toBe('MAINTENANCE');
  });
});
