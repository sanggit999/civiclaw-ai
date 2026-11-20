import { describe, it, expect } from 'vitest';
import { InMemorySessionStore } from '../../../src/session/in-memory-session-store.js';

describe('Session Store & History Management (Slice 1)', () => {
  it('tạo mới một phiên tư vấn và lấy lại thông tin phiên', async () => {
    const store = new InMemorySessionStore();
    const session = await store.createSession('Tư vấn luật giao thông đường bộ', 'user-001');

    expect(session.id).toBeDefined();
    expect(session.title).toBe('Tư vấn luật giao thông đường bộ');
    expect(session.userId).toBe('user-001');
    expect(session.createdAt).toBeDefined();

    const fetched = await store.getSession(session.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(session.id);
  });

  it('thêm tin nhắn hai chiều và truy xuất theo đúng thứ tự thời gian', async () => {
    const store = new InMemorySessionStore();
    const session = await store.createSession();

    await store.appendMessage({
      sessionId: session.id,
      role: 'user',
      content: 'Vượt đèn đỏ xe máy phạt bao nhiêu?',
    });

    await store.appendMessage({
      sessionId: session.id,
      role: 'assistant',
      content: 'Phạt tiền từ 400.000đ đến 600.000đ.',
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

    const messages = await store.getRecentMessages(session.id, 10);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toContain('Vượt đèn đỏ');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].citations).toHaveLength(1);
    expect(messages[1].isGrounded).toBe(true);
  });

  it('áp dụng cơ chế cửa sổ trượt (Sliding Window) khi vượt quá giới hạn limit', async () => {
    const store = new InMemorySessionStore();
    const session = await store.createSession();

    // Thêm 6 tin nhắn tuần tự (3 cặp hỏi - đáp)
    for (let i = 1; i <= 6; i++) {
      await store.appendMessage({
        sessionId: session.id,
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: `Nội dung tin nhắn số ${i}`,
      });
    }

    // Yêu cầu chỉ lấy 4 tin nhắn gần nhất
    const slidingMsgs = await store.getRecentMessages(session.id, 4);
    expect(slidingMsgs).toHaveLength(4);
    expect(slidingMsgs[0].content).toBe('Nội dung tin nhắn số 3');
    expect(slidingMsgs[1].content).toBe('Nội dung tin nhắn số 4');
    expect(slidingMsgs[2].content).toBe('Nội dung tin nhắn số 5');
    expect(slidingMsgs[3].content).toBe('Nội dung tin nhắn số 6');
  });

  it('xóa phiên và toàn bộ tin nhắn liên quan', async () => {
    const store = new InMemorySessionStore();
    const session = await store.createSession();

    await store.appendMessage({
      sessionId: session.id,
      role: 'user',
      content: 'Câu hỏi thử nghiệm',
    });

    const deleted = await store.deleteSession(session.id);
    expect(deleted).toBe(true);

    const checkSession = await store.getSession(session.id);
    expect(checkSession).toBeNull();

    const checkMessages = await store.getRecentMessages(session.id, 10);
    expect(checkMessages).toHaveLength(0);
  });
});
