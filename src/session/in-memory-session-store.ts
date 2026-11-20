import {
  ChatMessage,
  ChatSession,
  ISessionStore,
} from './types.js';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

/**
 * Bộ lưu trữ phiên trò chuyện trong bộ nhớ RAM (In-Memory Session Store)
 * Phục vụ kiểm thử offline, CI/CD và môi trường không kết nối mạng
 */
export class InMemorySessionStore implements ISessionStore {
  private sessions: Map<string, ChatSession> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();

  /**
   * Tạo mới một phiên hội thoại
   */
  async createSession(title = 'Phiên tư vấn pháp luật', userId?: string): Promise<ChatSession> {
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: generateUuid(),
      userId,
      title,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);
    this.messages.set(session.id, []);
    return session;
  }

  /**
   * Lấy thông tin một phiên theo ID
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Lấy danh sách tin nhắn gần nhất theo cơ chế cửa sổ trượt (Sliding Window)
   */
  async getRecentMessages(sessionId: string, limit = 6): Promise<ChatMessage[]> {
    const sessionMsgs = this.messages.get(sessionId) || [];
    if (sessionMsgs.length <= limit) {
      return [...sessionMsgs];
    }
    return sessionMsgs.slice(sessionMsgs.length - limit);
  }

  /**
   * Thêm một tin nhắn mới vào phiên và cập nhật thời gian updatedAt
   */
  async appendMessage(
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ): Promise<ChatMessage> {
    const session = this.sessions.get(message.sessionId);
    const now = new Date().toISOString();

    if (session) {
      session.updatedAt = now;
    }

    const newMessage: ChatMessage = {
      ...message,
      id: generateUuid(),
      createdAt: now,
    };

    const sessionMsgs = this.messages.get(message.sessionId) || [];
    sessionMsgs.push(newMessage);
    this.messages.set(message.sessionId, sessionMsgs);

    return newMessage;
  }

  /**
   * Xóa một phiên và toàn bộ tin nhắn liên quan
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const existed = this.sessions.delete(sessionId);
    this.messages.delete(sessionId);
    return existed;
  }
}
