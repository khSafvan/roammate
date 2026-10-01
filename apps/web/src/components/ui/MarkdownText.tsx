import React from 'react';

interface MarkdownTextProps {
  text?: string;
  className?: string;
}

/**
 * Lightweight, zero-dependency Markdown renderer.
 * Safely parses bold (**text**), italic (*text*), bullet lists (- item),
 * numbered lists (1. item), and links ([title](url)) without dangerouslySetInnerHTML.
 */
export function parseMarkdownToElements(text?: string, className = ''): React.ReactNode {
  if (!text) return null;

  // Split into lines
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="markdown-list markdown-ul">
            {currentList.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="markdown-list markdown-ol">
            {currentList.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Empty line -> paragraph break
    if (!trimmed) {
      flushList();
      elements.push(<span key={`break-${lineIdx}`} className="markdown-break" />);
      return;
    }

    // Unordered list: - item or * item
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(renderInline(ulMatch[1], `${lineIdx}-item`));
      return;
    }

    // Ordered list: 1. item
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(renderInline(olMatch[1], `${lineIdx}-item`));
      return;
    }

    // Regular line
    flushList();
    elements.push(
      <p key={`p-${lineIdx}`} className="markdown-p">
        {renderInline(line, `line-${lineIdx}`)}
      </p>
    );
  });

  flushList();

  return <div className={`markdown-content ${className}`}>{elements}</div>;
}

export const MarkdownText: React.FC<MarkdownTextProps> = React.memo(function MarkdownText({
  text,
  className = '',
}) {
  return parseMarkdownToElements(text, className) as React.ReactElement | null;
});

/**
 * Parses inline formatting: **bold**, *italic*, `code`, [title](url)
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Tokenizer regex matching bold, italic, code, and links
  const regex = /(\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;

    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('__') && token.endsWith('__')) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('_') && token.endsWith('_')) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<code key={key} className="markdown-inline-code">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('[') && token.includes('](')) {
      const splitIdx = token.indexOf('](');
      const linkText = token.slice(1, splitIdx);
      const linkUrl = token.slice(splitIdx + 2, -1);
      parts.push(
        <a key={key} href={linkUrl} target="_blank" rel="noopener noreferrer" className="markdown-link">
          {linkText}
        </a>
      );
    } else {
      parts.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
