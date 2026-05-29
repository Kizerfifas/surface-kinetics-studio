import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyTextEdit,
  getCompletionItems,
  getWordBeforeCursor,
  FUNCTIONS,
  OPERATORS,
  SNIPPETS,
} from '../lib/expressionCatalog';

/**
 * Formula input with autocomplete, variable chips, operators, and snippets.
 * @param {'rate'|'probability'|'lambda'} context
 */
export default function ExpressionField({
  value,
  onChange,
  context,
  rateIds = [],
  placeholder = 'expr',
  rows = 2,
}) {
  const textareaRef = useRef(null);
  const wrapRef = useRef(null);
  const [acOpen, setAcOpen] = useState(false);
  const [acIndex, setAcIndex] = useState(0);
  const [prefix, setPrefix] = useState('');

  const allItems = useMemo(() => getCompletionItems(context, rateIds), [context, rateIds]);

  const filtered = useMemo(() => {
    if (!prefix) return allItems.slice(0, 24);
    const p = prefix.toLowerCase();
    return allItems
      .filter((item) => item.name.toLowerCase().startsWith(p))
      .slice(0, 24);
  }, [allItems, prefix]);

  const closeAc = useCallback(() => {
    setAcOpen(false);
    setAcIndex(0);
    setPrefix('');
  }, []);

  const commitEdit = useCallback(
    (insert, cursorOffset = 0, replaceWord = true) => {
      const el = textareaRef.current;
      if (!el) return;
      let start = el.selectionStart;
      let end = el.selectionEnd;
      if (replaceWord && prefix) {
        start -= prefix.length;
      }
      const { value: next, selectionStart, selectionEnd } = applyTextEdit(
        value,
        start,
        end,
        insert,
        cursorOffset,
      );
      onChange(next);
      closeAc();
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(selectionStart, selectionEnd);
      });
    },
    [value, onChange, prefix, closeAc],
  );

  const pickItem = useCallback(
    (item) => {
      commitEdit(item.insert ?? item.name, item.cursorOffset ?? 0, true);
    },
    [commitEdit],
  );

  const updateAutocomplete = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const word = getWordBeforeCursor(value, el.selectionStart);
    if (word.length >= 1) {
      setPrefix(word);
      setAcOpen(true);
      setAcIndex(0);
    } else {
      closeAc();
    }
  }, [value, closeAc]);

  const handleChange = (e) => {
    onChange(e.target.value);
    requestAnimationFrame(updateAutocomplete);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeAc();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      setPrefix('');
      setAcOpen(true);
      setAcIndex(0);
      return;
    }
    if (!acOpen || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAcIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAcIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      pickItem(filtered[acIndex]);
    }
  };

  useEffect(() => {
    const onDocClick = (ev) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target)) closeAc();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [closeAc]);

  const snippets = SNIPPETS[context] || [];

  return (
    <div className="expr-field" ref={wrapRef}>
      <div className="expr-toolbar">
        <span className="expr-toolbar-group">
          {FUNCTIONS.map((f) => (
            <button
              key={f.name}
              type="button"
              className="expr-chip expr-chip-fn"
              title={f.desc}
              onClick={() => commitEdit(f.insert, f.cursorOffset, false)}
            >
              {f.name}()
            </button>
          ))}
        </span>
        <span className="expr-toolbar-group">
          {OPERATORS.map((op) => (
            <button
              key={op.label}
              type="button"
              className="expr-chip expr-chip-op"
              onClick={() => commitEdit(op.insert, 0, false)}
            >
              {op.label}
            </button>
          ))}
        </span>
      </div>

      {snippets.length > 0 && (
        <div className="expr-toolbar expr-toolbar-snippets">
          <span className="expr-toolbar-label">Шаблоны:</span>
          {snippets.map((s) => (
            <button
              key={s.label}
              type="button"
              className="expr-chip expr-chip-snippet"
              onClick={() => commitEdit(s.insert, 0, false)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="expr-vars">
        <span className="expr-toolbar-label">Переменные:</span>
        {allItems
          .filter((i) => i.kind === 'variable')
          .slice(0, context === 'lambda' ? 14 : 12)
          .map((v) => (
            <button
              key={v.name}
              type="button"
              className="expr-chip expr-chip-var"
              title={v.desc}
              onClick={() => commitEdit(v.name, 0, false)}
            >
              {v.name}
            </button>
          ))}
        <button
          type="button"
          className="expr-chip expr-chip-muted"
          title="Показать список (Ctrl+Space)"
          onClick={() => {
            setPrefix('');
            setAcOpen(true);
            textareaRef.current?.focus();
          }}
        >
          …
        </button>
      </div>

      <div className="expr-input-wrap">
        <textarea
          ref={textareaRef}
          className="mono expr-textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={updateAutocomplete}
          onClick={updateAutocomplete}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={acOpen}
        />
        {acOpen && filtered.length > 0 && (
          <ul className="expr-ac" role="listbox">
            {filtered.map((item, i) => (
              <li key={`${item.kind}-${item.name}`}>
                <button
                  type="button"
                  className={i === acIndex ? 'active' : ''}
                  role="option"
                  aria-selected={i === acIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickItem(item);
                  }}
                >
                  <span className="expr-ac-name">{item.name}</span>
                  {item.desc && <span className="expr-ac-desc">{item.desc}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="expr-hint">Ctrl+Space — список · Tab/Enter — вставить · ↑↓ — выбор</p>
    </div>
  );
}
