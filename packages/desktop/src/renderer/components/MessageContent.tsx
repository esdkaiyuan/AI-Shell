import React from 'react';
import './MessageContent.css';

interface MessageContentProps {
  content: string;
}

const renderInline = (text: string, keyPrefix: string): React.ReactNode[] =>
  text.split(/(`[^`\n]+`)/g).map((chunk, index) => {
    if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length > 2) {
      return (
        <code key={`${keyPrefix}-inline-${index}`} className="md-inline">
          {chunk.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${keyPrefix}-text-${index}`}>{chunk}</React.Fragment>;
  });

/**
 * Lightweight renderer for assistant replies: fenced code blocks and inline code.
 * Keeps plain text untouched (no HTML parsing) so terminal output stays safe.
 */
const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  const parts: React.ReactNode[] = [];
  const fence = /```([a-zA-Z0-9]*)[ \t]*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let blockIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(content)) !== null) {
    const text = content.slice(lastIndex, match.index);
    if (text.trim()) {
      parts.push(
        <div key={`text-${blockIndex}`} className="md-text">
          {renderInline(text.replace(/^\n+|\n+$/g, ''), `text-${blockIndex}`)}
        </div>
      );
    }

    const code = match[2].replace(/\n+$/g, '');
    if (code.trim()) {
      parts.push(
        <div key={`code-${blockIndex}`} className="md-code-block">
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    blockIndex += 1;
    lastIndex = match.index + match[0].length;
  }

  const tail = content.slice(lastIndex);
  if (tail.trim()) {
    // During streaming a fence may still be open: render the remainder as code
    // instead of flashing raw backticks.
    const openFenceIndex = tail.indexOf('```');
    const textPart = openFenceIndex >= 0 ? tail.slice(0, openFenceIndex) : tail;
    if (textPart.trim()) {
      parts.push(
        <div key={`text-${blockIndex}`} className="md-text">
          {renderInline(textPart.replace(/^\n+|\n+$/g, ''), `text-${blockIndex}`)}
        </div>
      );
    }
    if (openFenceIndex >= 0) {
      const openCode = tail
        .slice(openFenceIndex)
        .replace(/^```[a-zA-Z0-9]*[ \t]*\n?/, '');
      if (openCode.trim()) {
        parts.push(
          <div key={`code-${blockIndex}`} className="md-code-block">
            <pre>
              <code>{openCode}</code>
            </pre>
          </div>
        );
      }
    }
  }

  if (parts.length === 0) {
    return <div className="md-text">{content}</div>;
  }

  return <div className="md-content">{parts}</div>;
};

export default MessageContent;
