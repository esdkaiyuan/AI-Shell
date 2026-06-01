import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, CloseIcon } from './Icons';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (term: string, options: { caseSensitive: boolean; wholeWord: boolean; regex: boolean }) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  resultCount?: { current: number; total: number };
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onNext,
  onPrevious,
  onClose,
  resultCount,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 自动聚焦输入框
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // 搜索词或选项变化时触发搜索
    if (searchTerm) {
      onSearch(searchTerm, { caseSensitive, wholeWord, regex });
    }
  }, [searchTerm, caseSensitive, wholeWord, regex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevious();
      } else {
        onNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <SearchIcon size={14} />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索..."
          className="search-input"
        />
        {resultCount && resultCount.total > 0 && (
          <span className="search-count">
            {resultCount.current}/{resultCount.total}
          </span>
        )}
      </div>

      <div className="search-options">
        <button
          className={`search-option-btn ${caseSensitive ? 'active' : ''}`}
          onClick={() => setCaseSensitive(!caseSensitive)}
          title="区分大小写"
        >
          Aa
        </button>
        <button
          className={`search-option-btn ${wholeWord ? 'active' : ''}`}
          onClick={() => setWholeWord(!wholeWord)}
          title="全字匹配"
        >
          |ab|
        </button>
        <button
          className={`search-option-btn ${regex ? 'active' : ''}`}
          onClick={() => setRegex(!regex)}
          title="正则表达式"
        >
          .*
        </button>
      </div>

      <div className="search-navigation">
        <button
          className="search-nav-btn"
          onClick={onPrevious}
          disabled={!searchTerm || !resultCount || resultCount.total === 0}
          title="上一个 (Shift+Enter)"
        >
          ↑
        </button>
        <button
          className="search-nav-btn"
          onClick={onNext}
          disabled={!searchTerm || !resultCount || resultCount.total === 0}
          title="下一个 (Enter)"
        >
          ↓
        </button>
      </div>

      <button className="search-close-btn" onClick={onClose} title="关闭 (Esc)">
        <CloseIcon size={14} />
      </button>
    </div>
  );
};

export default SearchBar;
