'use client';

import React from 'react';

export interface GuidedTopicItem {
  id?: string;
  title?: string;
  sampleQuery?: string;
  description?: string;
}

export interface MarkdownContentProps {
  content: string;
  guidedTopics?: Array<string | GuidedTopicItem>;
  onSelectTopic?: (topic: string) => void;
  isLoading?: boolean;
}

/**
 * Phân giải chuỗi inline: bold, italic, code, links
 */
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match bold (**...**), inline code (`...`), markdown links ([...](...)), or italic (*...*)
  const INLINE_REGEX = /(\*\*[^*]+?\*\*|`[^`]+?`|\[[^\]]+?\]\([^)]+?\)|(?<!\*)\*[^*]+?\*(?!\*))/g;
  const parts = text.split(INLINE_REGEX);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold (**text**)
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} style={{ fontWeight: 600, color: '#F8FAFC' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Inline Code / Statutory Badge (`doc_number`)
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          style={{
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            color: '#38BDF8',
            padding: '1.5px 6px',
            marginInline: '2px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'inline-block',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Markdown Link ([text](url))
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        return (
          <a
            key={index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#38BDF8',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            {match[1]}
          </a>
        );
      }
    }

    // Italic (*text*)
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} style={{ fontStyle: 'italic', color: '#94A3B8' }}>
          {part.slice(1, -1)}
        </em>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

/**
 * Component hiển thị câu trả lời Markdown chuyên sâu cho Legal AI Chatbot
 */
export function MarkdownContent({
  content,
  guidedTopics,
  onSelectTopic,
  isLoading,
}: MarkdownContentProps) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        color: '#E2E8F0',
        lineHeight: '1.65',
      }}
    >
      {lines.map((line, index) => {
        const trimmed = line.trim();

        // 1. Phân cách dòng (Divider: "---" hoặc "***")
        if (trimmed === '---' || trimmed === '***') {
          return (
            <div
              key={index}
              style={{
                height: '1px',
                background:
                  'linear-gradient(90deg, rgba(56, 189, 248, 0.25) 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)',
                margin: '12px 0',
              }}
            />
          );
        }

        // 2. Tiêu đề H3 (Ví dụ: "### 🚦 Bản Đồ...")
        if (line.startsWith('### ')) {
          return (
            <div
              key={index}
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#38BDF8',
                marginTop: index === 0 ? '0px' : '10px',
                marginBottom: '4px',
                lineHeight: '1.4',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {parseInline(line.slice(4))}
            </div>
          );
        }

        // 3. Tiêu đề H4 (Ví dụ: "#### 📜 Văn Bản...", "#### 🎯 4 Trọng Tâm...")
        if (line.startsWith('#### ')) {
          return (
            <div
              key={index}
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#60A5FA',
                marginTop: '10px',
                marginBottom: '3px',
                lineHeight: '1.4',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {parseInline(line.slice(5))}
            </div>
          );
        }

        // 4. Tiêu đề H2
        if (line.startsWith('## ')) {
          return (
            <div
              key={index}
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#38BDF8',
                marginTop: index === 0 ? '0px' : '12px',
                marginBottom: '6px',
                lineHeight: '1.4',
              }}
            >
              {parseInline(line.slice(3))}
            </div>
          );
        }

        // 5. Tiêu đề H1
        if (line.startsWith('# ')) {
          return (
            <div
              key={index}
              style={{
                fontSize: '17px',
                fontWeight: 800,
                color: '#F8FAFC',
                marginTop: index === 0 ? '0px' : '14px',
                marginBottom: '6px',
                lineHeight: '1.4',
              }}
            >
              {parseInline(line.slice(2))}
            </div>
          );
        }

        // 6. Danh sách không thứ tự (Bullet points: "- ", "* ")
        if (/^[-*]\s+/.test(line)) {
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                margin: '2px 0',
                paddingLeft: '4px',
              }}
            >
              <span
                style={{
                  color: '#38BDF8',
                  fontSize: '10px',
                  marginTop: '6px',
                  flexShrink: 0,
                }}
              >
                ●
              </span>
              <div style={{ flex: 1, color: '#E2E8F0' }}>
                {parseInline(line.replace(/^[-*]\s+/, ''))}
              </div>
            </div>
          );
        }

        // 7. Trích dẫn khối (Blockquote: "> ...")
        if (line.startsWith('> ')) {
          return (
            <div
              key={index}
              style={{
                borderLeft: '3px solid #38BDF8',
                backgroundColor: 'rgba(56, 189, 248, 0.06)',
                padding: '6px 12px',
                borderRadius: '0 6px 6px 0',
                margin: '6px 0',
                fontSize: '13px',
                color: '#94A3B8',
              }}
            >
              {parseInline(line.slice(2))}
            </div>
          );
        }

        // 8. Dòng trống (Khoảng trắng giữa các đoạn)
        if (trimmed === '') {
          return <div key={index} style={{ height: '6px' }} />;
        }

        // 9. Đoạn văn thường
        return (
          <div key={index} style={{ margin: '1px 0' }}>
            {parseInline(line)}
          </div>
        );
      })}

      {/* 10. Các chủ đề định hướng tương tác (Guided Topics) */}
      {guidedTopics && guidedTopics.length > 0 && (
        <div
          style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px dashed rgba(255, 255, 255, 0.12)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#38BDF8',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>💡</span> CHỦ ĐỀ GỢI Ý ĐỂ TRA CỨU TIẾP:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {guidedTopics.map((topicItem, idx) => {
              const label =
                typeof topicItem === 'string'
                  ? topicItem
                  : topicItem.title || topicItem.sampleQuery || topicItem.id || 'Chủ đề';
              const query =
                typeof topicItem === 'string'
                  ? topicItem
                  : topicItem.sampleQuery || topicItem.title || '';
              const key =
                typeof topicItem === 'string'
                  ? `${topicItem}-${idx}`
                  : topicItem.id || `${topicItem.title || 'topic'}-${idx}`;

              return (
                <button
                  key={key}
                  type="button"
                  title={typeof topicItem === 'object' ? topicItem.description || label : label}
                  onClick={() => !isLoading && onSelectTopic?.(query)}
                  disabled={isLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#E0F2FE',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '16px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
                      e.currentTarget.style.borderColor = '#38BDF8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                    }
                  }}
                >
                  <span>👉</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
