'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import {
  VStack,
  HStack,
  Card,
  Button,
  Badge,
  Text,
  Divider,
  ProgressBar,
  Banner,
  StackItem,
} from '@astryxdesign/core';
import { PageContainer } from '@/components/PageContainer';
import { MarkdownContent } from '@/components/MarkdownContent';
import {
  streamChatMessage,
  formatChatMaintenanceFallback,
  ChatCitation,
  ChatPlaygroundMessage,
  GuidedTopic,
} from '@/lib/api-client';

const DOMAIN_OPTIONS = [
  { value: 'all', label: 'Tất cả (5 Bộ luật)' },
  { value: 'Giao thông', label: 'Giao thông' },
  { value: 'Lao động', label: 'Lao động' },
  { value: 'BHXH', label: 'BHXH' },
  { value: 'Nhà ở', label: 'Nhà ở' },
  { value: 'Dân sự', label: 'Dân sự' },
];

const QUICK_PRESETS = [
  {
    icon: '🚦',
    domain: 'Giao thông',
    label: 'Vượt đèn đỏ xe máy',
    query: 'Vượt đèn đỏ xe máy bị xử phạt bao nhiêu tiền theo quy định mới nhất?',
  },
  {
    icon: '💼',
    domain: 'Lao động',
    label: 'Thử việc 90 ngày',
    query: 'Người sử dụng lao động có được áp dụng thời gian thử việc 90 ngày với nhân viên kỹ thuật không?',
  },
  {
    icon: '🏥',
    domain: 'BHXH',
    label: 'Chế độ thai sản BHXH',
    query: 'Điều kiện hưởng chế độ thai sản khi đóng BHXH bắt buộc từ đủ bao nhiêu tháng?',
  },
  {
    icon: '🏠',
    domain: 'Nhà ở',
    label: 'Đặt cọc thuê nhà',
    query: 'Bên cho thuê nhà có quyền lấy lại nhà bất cứ lúc nào chỉ cần báo trước 3 ngày không?',
  },
  {
    icon: '⚖️',
    domain: 'Dân sự',
    label: 'Hợp đồng vô hiệu',
    query: 'Các trường hợp giao dịch dân sự vô hiệu do vi phạm điều cấm của luật?',
  },
];

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-play-${Date.now().toString(36)}`;
}

export default function ChatPlaygroundPage() {
  const [, startTransition] = useTransition();

  // Session & Inspector Parameters - Khởi tạo giá trị cố định để khớp SSR, sau đó cập nhật trên Client
  const [sessionId, setSessionId] = useState<string>('session-playground');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isGatewayMaintenance, setIsGatewayMaintenance] = useState<boolean>(false);

  // Sinh Session ID trên Client khi mount
  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  // Messages & Chat state
  const [messages, setMessages] = useState<ChatPlaygroundMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Xin chào Quản trị viên! Đây là Sân Thử Nghiệm Hỏi Đáp Pháp Lý AI (Chatbot Playground).\n\nBạn có thể nhập câu hỏi thực tế hoặc bấm chọn các câu hỏi mẫu bên dưới để kiểm chứng trực quan phản xạ của AI: quy trình suy luận (Reasoning Pulse), sinh câu trả lời theo thời gian thực và đối soát căn cứ trích dẫn chính thống từ 5 bộ luật.',
      timestamp: 'Sẵn sàng',
      isGrounded: true,
      confidenceScore: 1.0,
      citations: [
        {
          docNumber: '168/2024/NĐ-CP',
          title: 'Nghị định Xử phạt vi phạm giao thông & trừ điểm GPLX',
          fullReference: 'Nghị định 168/2024/NĐ-CP & Luật 36/2024/QH15',
          isVerified: true,
        },
        {
          docNumber: '45/2019/QH14',
          title: 'Bộ luật Lao động 2019',
          fullReference: 'Bộ luật Lao động số 45/2019/QH14',
          isVerified: true,
        },
      ],
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCitationIdx, setCopiedCitationIdx] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll xuống dòng mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Tạo phiên mới (Reset Session)
  const handleResetSession = () => {
    const newSession = generateSessionId();
    setSessionId(newSession);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: 'Phiên hỏi đáp đã được làm mới. Mời bạn nhập câu hỏi pháp lý để bắt đầu phiên kiểm thử mới.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isGrounded: true,
        confidenceScore: 1.0,
      },
    ]);
    setInputQuery('');
    inputRef.current?.focus();
  };

  // Gửi câu hỏi
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputQuery).trim();
    if (!query || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const botMessageId = `bot-${Date.now() + 1}`;
    const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Thêm tin nhắn của User và tin nhắn Bot ở trạng thái Thinking
    startTransition(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          content: query,
          timestamp: currentTime,
        },
        {
          id: botMessageId,
          role: 'assistant',
          content: '',
          timestamp: currentTime,
          isThinking: true,
          thinkingStep: 'Đang phân tích & tái tạo ngữ cảnh câu hỏi...',
        },
      ]);
    });

    setInputQuery('');
    setIsLoading(true);

    try {
      let accumulatedAnswer = '';

      const resultData = await streamChatMessage(
        {
          query,
          sessionId,
          domain: selectedDomain === 'all' ? undefined : selectedDomain,
        },
        // onToken callback
        (token: string) => {
          accumulatedAnswer += token;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    isThinking: false,
                    content: accumulatedAnswer,
                  }
                : msg
            )
          );
        },
        // onProgress callback
        (_step: string, message: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId && msg.isThinking
                ? {
                    ...msg,
                    thinkingStep: message,
                  }
                : msg
            )
          );
        },
        // onCitations callback
        (citations: ChatCitation[]) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    citations,
                    isGrounded: citations.length > 0,
                  }
                : msg
            )
          );
        },
        // onGuidedTopics callback
        (guidedTopics: GuidedTopic[]) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    guidedTopics,
                  }
                : msg
            )
          );
        }
      );

      // Đồng bộ sessionId thật từ server để giữ mạch hội thoại & xưng hô xuyên suốt các lượt
      setIsGatewayMaintenance(false);
      if (resultData?.sessionId && resultData.sessionId !== sessionId) {
        setSessionId(resultData.sessionId);
      }

      if (resultData) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  isThinking: false,
                  content: accumulatedAnswer || resultData.answer,
                  citations: resultData.citations,
                  isGrounded: resultData.isGrounded,
                  confidenceScore: resultData.confidenceScore,
                  standaloneQuery: resultData.standaloneQuery,
                  guidedTopics:
                    resultData.guidedTopics && resultData.guidedTopics.length > 0
                      ? resultData.guidedTopics
                      : msg.guidedTopics,
                }
              : msg
          )
        );
      }
    } catch (err: unknown) {
      console.warn('[ChatUI] Kết nối Gateway gián đoạn, hiển thị thông báo bảo trì:', err);
      setIsGatewayMaintenance(true);
      const maintenanceFallback = formatChatMaintenanceFallback(sessionId, query);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                isThinking: false,
                content: maintenanceFallback.answer,
                isGrounded: false,
                error: 'MAINTENANCE',
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Sao chép trích dẫn luật
  const handleCopyCitation = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCitationIdx(key);
    setTimeout(() => setCopiedCitationIdx(null), 2000);
  };

  // Xử lý phím Enter / Shift+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <PageContainer
      title="Sân Thử Nghiệm Hỏi Đáp Pháp Lý AI (Chatbot Playground)"
      description="Kiểm chứng trực quan luồng suy luận (Reasoning Pulse), sinh câu trả lời theo thời gian thực và đối soát căn cứ trích dẫn 5 bộ luật."
      headerEndContent={
        <HStack gap={2} vAlign="center">
          <Badge label={`Phiên: ${sessionId.slice(0, 16)}`} variant="neutral" />
          <Button
            label="Tạo phiên mới"
            variant="secondary"
            size="sm"
            onClick={handleResetSession}
            isDisabled={isLoading}
            style={{
              fontSize: '12px',
              paddingBlock: '6px',
              paddingInline: '12px',
              cursor: 'pointer',
            }}
          />
        </HStack>
      }
    >
      <VStack gap={4}>
        {/* ======================================================== */}
        {/* 1. THANH ĐIỀU KHIỂN INSPECTOR: DOMAIN & CONFIDENCE      */}
        {/* ======================================================== */}
        <Card
          padding={3}
          style={{
            backgroundColor: '#131B2E',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
          }}
        >
          <HStack gap={4} vAlign="center" wrap="wrap">
            {/* Lĩnh vực trọng tâm */}
            <HStack gap={2} vAlign="center">
              <Text type="supporting" style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>
                LĨNH VỰC:
              </Text>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {DOMAIN_OPTIONS.map((item) => {
                  const isSelected = selectedDomain === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSelectedDomain(item.value)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 600 : 400,
                        backgroundColor: isSelected ? '#2563EB' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#FFFFFF' : '#94A3B8',
                        border: isSelected ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </HStack>

            <Divider orientation="vertical" style={{ height: '24px' }} />

            {/* Trạng thái Gateway */}
            <HStack gap={1} vAlign="center" style={{ marginLeft: 'auto' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isGatewayMaintenance ? '#F59E0B' : '#10B981',
                }}
              />
              <Text
                type="supporting"
                style={{
                  fontSize: '11.5px',
                  color: isGatewayMaintenance ? '#F59E0B' : '#10B981',
                  fontWeight: 500,
                }}
              >
                {isGatewayMaintenance ? 'Gateway :3001 Bảo trì' : 'Gateway :3001 Live'}
              </Text>
            </HStack>
          </HStack>
        </Card>

        {/* ======================================================== */}
        {/* 2. DẢI CÂU HỎI MẪU QUICK PRESETS (5 BỘ LUẬT)            */}
        {/* ======================================================== */}
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Text type="supporting" style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            Câu hỏi mẫu:
          </Text>
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleSendMessage(preset.query)}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                color: '#CBD5E1',
                backgroundColor: '#131B2E',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.5)';
                  e.currentTarget.style.backgroundColor = '#182238';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.backgroundColor = '#131B2E';
              }}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </HStack>

        {/* ======================================================== */}
        {/* 3. KHUNG HỘI THOẠI TRUNG TÂM (MESSAGE FEED)             */}
        {/* ======================================================== */}
        <Card
          padding={0}
          style={{
            backgroundColor: '#090D16',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            minHeight: '480px',
            maxHeight: '620px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Scrollable Message List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    width: '100%',
                  }}
                >
                  {/* Sender Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px',
                      paddingInline: '4px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: isUser ? '#60A5FA' : '#10B981' }}>
                      {isUser ? '👤 Quản Trị Viên' : '🤖 CivicLaw Assistant'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                      {msg.timestamp}
                    </span>
                    {msg.isGrounded && (
                      <Badge label="✓ 100% Grounded" variant="teal" />
                    )}
                    {typeof msg.confidenceScore === 'number' && msg.confidenceScore > 0 && (
                      <Badge label={`Tin cậy: ${(msg.confidenceScore * 100).toFixed(0)}%`} variant="neutral" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '14px 18px',
                      borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      backgroundColor: isUser ? '#1E3A8A' : '#131B2E',
                      color: isUser ? '#FFFFFF' : '#F8FAFC',
                      border: isUser ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderLeft: isUser ? '1px solid rgba(59, 130, 246, 0.4)' : '3px solid #10B981',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      fontSize: '13.5px',
                      lineHeight: '1.6',
                      wordBreak: 'break-word',
                      whiteSpace: isUser ? 'pre-wrap' : 'normal',
                    }}
                  >
                    {/* Trạng thái Thinking Pulse */}
                    {msg.isThinking ? (
                      <VStack gap={2}>
                        <HStack gap={2} vAlign="center">
                          <span
                            style={{
                              display: 'inline-block',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: '#10B981',
                              boxShadow: '0 0 10px #10B981',
                            }}
                          />
                          <Text
                            type="body"
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: '#34D399',
                              fontStyle: 'italic',
                            }}
                          >
                            {msg.thinkingStep || 'Đang suy nghĩ...'}
                          </Text>
                        </HStack>
                        <ProgressBar
                          value={65}
                          max={100}
                          label="Thinking"
                          isLabelHidden
                          variant="success"
                        />
                      </VStack>
                    ) : isUser ? (
                      <div>{msg.content}</div>
                    ) : (
                      <MarkdownContent
                        content={msg.content}
                        guidedTopics={msg.guidedTopics}
                        onSelectTopic={(topic) => handleSendMessage(topic)}
                        isLoading={isLoading}
                      />
                    )}

                    {/* Danh sách căn cứ trích dẫn nguồn luật */}
                    {msg.citations && msg.citations.length > 0 && !msg.isThinking && (
                      <div
                        style={{
                          marginTop: '14px',
                          paddingTop: '12px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <Text
                          type="supporting"
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#94A3B8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            marginBottom: '8px',
                            display: 'block',
                          }}
                        >
                          📜 CĂN CỨ PHÁP LUẬT ĐỐI SOÁT ({msg.citations.length} nguồn chính thống):
                        </Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {msg.citations.map((cit, idx) => {
                            const citKey = `${msg.id}-cit-${idx}`;
                            const isCopied = copiedCitationIdx === citKey;

                            return (
                              <div
                                key={citKey}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid rgba(255, 255, 255, 0.06)',
                                  borderRadius: '6px',
                                  gap: '12px',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#38BDF8' }}>
                                    {cit.fullReference || cit.docNumber}
                                  </span>
                                  {cit.title && (
                                    <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                                      {cit.title}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCitation(cit.fullReference || cit.docNumber || '', citKey)}
                                  style={{
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    backgroundColor: isCopied ? '#10B981' : 'rgba(255, 255, 255, 0.06)',
                                    color: isCopied ? '#FFFFFF' : '#CBD5E1',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {isCopied ? 'Đã chép ✓' : 'Sao chép'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* ======================================================== */}
          {/* 4. THANH NHẬP LIỆU ĐÁY (BOTTOM CHAT INPUT AREA)          */}
          {/* ======================================================== */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#131B2E',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <HStack gap={2} vAlign="end">
              <StackItem size="fill">
                <textarea
                  ref={inputRef}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập câu hỏi pháp lý để thử nghiệm phản xạ của AI... (Enter để gửi, Shift+Enter xuống dòng)"
                  rows={2}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    backgroundColor: '#090D16',
                    color: '#F8FAFC',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    lineHeight: '1.4',
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2563EB';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  }}
                />
              </StackItem>
              <Button
                label={isLoading ? 'Đang gửi...' : '➤ Gửi'}
                variant="primary"
                onClick={() => handleSendMessage()}
                isDisabled={isLoading || !inputQuery.trim()}
                style={{
                  height: '52px',
                  paddingInline: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#2563EB',
                  borderRadius: '8px',
                  cursor: isLoading || !inputQuery.trim() ? 'not-allowed' : 'pointer',
                }}
              />
            </HStack>

            <HStack gap={2} vAlign="center" style={{ marginTop: '8px' }}>
              <Text type="supporting" style={{ fontSize: '11px', color: '#64748B' }}>
                Phím tắt: Enter để gửi • Shift+Enter xuống dòng • CivicLaw Grounded RAG v1.0
              </Text>
            </HStack>
          </div>
        </Card>
      </VStack>
    </PageContainer>
  );
}
