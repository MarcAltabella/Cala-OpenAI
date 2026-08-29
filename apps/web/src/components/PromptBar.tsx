import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  AtSign,
  ChevronDown,
  FileText,
  Globe2,
  Image,
  LoaderCircle,
  Mic,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import './PromptBar.css';

type PromptBarProps = {
  placeholder?: string;
  onSend?: (value: string) => void;
  variant?: 'Rounded' | 'Pill';
  demo?: boolean;
  busy?: boolean;
  hint?: string;
};

const SOURCES = [
  { label: 'Upload files', hint: 'PDF, CSV, DOCX', icon: FileText },
  { label: 'Web search', hint: 'Latest healthcare signals', icon: Globe2 },
  { label: 'Knowledge graph', hint: 'Companies and relationships', icon: Sparkles },
];

const COMMANDS = [
  { label: 'Compare companies', value: '/compare-companies', icon: Zap },
  { label: 'Find clinical signals', value: '/clinical-signal', icon: Sparkles },
  { label: 'Summarize evidence', value: '/summarize', icon: FileText },
];

export function PromptBar({ placeholder = 'Ask predict anything…', onSend, variant = 'Rounded', busy = false, hint }: PromptBarProps) {
  const [value, setValue] = useState('');
  const [menu, setMenu] = useState<'source' | 'command' | 'model' | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [model, setModel] = useState('Predict Reasoning');
  const [listIndex, setListIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const activeItems = menu === 'source' ? SOURCES : menu === 'command' ? COMMANDS : [];
  const send = () => {
    const next = value.trim();
    if (!next || busy) return;
    onSend?.(next);
    setValue('');
    setMenu(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (menu && activeItems.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setListIndex((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + activeItems.length) % activeItems.length);
      return;
    }
    if (menu && activeItems.length && event.key === 'Enter') {
      event.preventDefault();
      const selected = activeItems[listIndex];
      if ('value' in selected) setValue((current) => `${current}${selected.value} `);
      else setAttachments((current) => [...current, selected.label]);
      setMenu(null);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const updateValue = (next: string) => {
    setValue(next);
    const last = next.slice(-1);
    if (last === '@') { setMenu('source'); setListIndex(0); }
    else if (last === '/') { setMenu('command'); setListIndex(0); }
    else if (menu === 'source' || menu === 'command') setMenu(null);
  };

  return (
    <div ref={rootRef} className={`promptbar promptbar-${variant.toLowerCase()}`}>
      {(menu === 'source' || menu === 'command') && (
        <div className="promptbar-menu" role="listbox">
          <div className="promptbar-menu-title">{menu === 'source' ? 'Add context' : 'Commands'}</div>
          {activeItems.map((item, index) => {
            const Icon = item.icon;
            return <button key={item.label} className={index === listIndex ? 'is-selected' : ''} onMouseDown={(event) => event.preventDefault()} onClick={() => { if ('value' in item) setValue((current) => `${current}${item.value} `); else setAttachments((current) => [...current, item.label]); setMenu(null); }}><Icon size={15} /><span>{item.label}<small>{'hint' in item ? item.hint : item.value}</small></span></button>;
          })}
        </div>
      )}
      {menu === 'model' && <div className="promptbar-model-menu"><button onClick={() => { setModel('Predict Reasoning'); setMenu(null); }}>Predict Reasoning</button><button onClick={() => { setModel('Predict Fast'); setMenu(null); }}><Zap size={15} />Predict Fast</button></div>}
      {attachments.length > 0 && <div className="promptbar-attachments">{attachments.map((item, index) => <span key={`${item}-${index}`}><FileText size={12} />{item}<button aria-label={`Remove ${item}`} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={12} /></button></span>)}</div>}
      <textarea aria-label="Prompt" rows={1} value={value} placeholder={placeholder} onChange={(event) => updateValue(event.target.value)} onKeyDown={handleKeyDown} />
      <div className="promptbar-toolbar">
        <div className="promptbar-toolbar-left">
          <button aria-label="Add source" className="promptbar-icon" onClick={() => setMenu(menu === 'source' ? null : 'source')}><Plus size={16} /></button>
          <button aria-label="Attach file" className="promptbar-icon" onClick={() => setAttachments((current) => [...current, 'Company evidence.pdf'])}><Paperclip size={15} /></button>
          <button className="promptbar-model" onClick={() => setMenu(menu === 'model' ? null : 'model')}>{model}<ChevronDown size={13} /></button>
        </div>
        <div className="promptbar-toolbar-right">
          <button aria-label="Dictate" className={`promptbar-icon ${listening ? 'is-listening' : ''}`} onClick={() => { setListening((current) => !current); setTimeout(() => setListening(false), 1600); }}><Mic size={15} /></button>
          <button aria-label="Add image" className="promptbar-icon"><Image size={15} /></button>
          <button aria-label="Send prompt" className="promptbar-send" disabled={!value.trim() || busy} onClick={send}>{listening || busy ? <LoaderCircle className="promptbar-spin" size={15} /> : <Send size={15} />}</button>
        </div>
      </div>
      <div className="promptbar-hint"><AtSign size={11} /> {hint ?? <>sources <span>/</span> commands</>} <kbd>Enter</kbd> to run</div>
    </div>
  );
}
