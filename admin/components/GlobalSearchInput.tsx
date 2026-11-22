'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HStack, Badge, Text } from '@astryxdesign/core';

export function GlobalSearchInput() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Phím tắt toàn cục: Ctrl + K (hoặc Cmd + K trên macOS) để kích hoạt ô tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) return;
    router.push(`/laws?q=${encodeURIComponent(trimmed)}`);
  };

  const handleClear = () => {
    setSearchValue('');
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: 0, padding: 0 }}>
      <HStack
        gap={2}
        vAlign="center"
        onClick={() => inputRef.current?.focus()}
        style={{
          backgroundColor: isFocused ? 'rgba(125, 125, 125, 0.12)' : 'rgba(125, 125, 125, 0.06)',
          border: isFocused ? '1px solid rgba(56, 189, 248, 0.75)' : '1px solid rgba(125, 125, 125, 0.22)',
          borderRadius: '6px',
          paddingInline: '10px',
          paddingBlock: '4px',
          minWidth: '380px',
          maxWidth: '480px',
          transition: 'all 0.18s ease-in-out',
          boxShadow: isFocused ? '0 0 0 2px rgba(56, 189, 248, 0.18)' : 'none',
          cursor: 'text',
        }}
      >
        <Text type="supporting" style={{ fontSize: '13px', userSelect: 'none', lineHeight: 1 }}>
          🔍
        </Text>
        <input
          ref={inputRef}
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Tìm kiếm điều luật, phiên hỏi đáp, hợp đồng..."
          aria-label="Tìm kiếm toàn hệ thống"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'inherit',
            fontSize: '12px',
            width: '100%',
            minWidth: '220px',
            lineHeight: 1.5,
          }}
        />
        {searchValue ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              opacity: 0.6,
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Xóa từ khóa"
            aria-label="Xóa từ khóa"
          >
            ✕
          </button>
        ) : null}
        <span style={{ flexShrink: 0 }}>
          <Badge label="Ctrl + K" variant="neutral" />
        </span>
      </HStack>
    </form>
  );
}
