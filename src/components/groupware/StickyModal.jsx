import { useState } from 'react';
import Modal from '../common/Modal';
import { useSticky } from '../../contexts/StickyContext';
import { useToast } from '../../contexts/ToastContext';

const COLORS = [
  { id: '',       bg: '#fef08a' },
  { id: 'blue',   bg: '#bae6fd' },
  { id: 'green',  bg: '#bbf7d0' },
  { id: 'pink',   bg: '#fecdd3' },
  { id: 'purple', bg: '#e9d5ff' },
];

const COLOR_MAP = COLORS.reduce((acc, c) => ({ ...acc, [c.id]: c.bg }), {});

export default function StickyModal({ isOpen, onClose }) {
  const toast = useToast();
  const { notes, addNote, deleteNote } = useSticky();
  const [input, setInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const handleAdd = () => {
    const text = input.trim();
    if (!text) {
      toast.warning('메모 내용을 입력하세요.');
      return;
    }
    addNote(text, selectedColor);
    setInput('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <>
          <i className="fa-solid fa-note-sticky" style={{ color: '#f1c40f' }}></i>
          스티커 메모
        </>
      }
    >
      {/* 메모 추가 폼 */}
      <div className="sticky-add-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메모를 입력하세요..."
        />

        <div className="sticky-color-picker">
          <span>색상:</span>
          {COLORS.map((c) => (
            <div
              key={c.id}
              className={`color-opt ${selectedColor === c.id ? 'selected' : ''}`}
              style={{ background: c.bg }}
              onClick={() => setSelectedColor(c.id)}
            ></div>
          ))}
        </div>

        <button className="sticky-submit" onClick={handleAdd}>
          <i className="fa-solid fa-plus"></i> 메모 추가
        </button>
      </div>

      {/* 저장된 메모 목록 */}
      <div
        style={{
          fontSize: '0.8rem',
          fontWeight: 800,
          color: 'var(--text-muted)',
          marginBottom: 10,
          letterSpacing: '0.5px',
        }}
      >
        저장된 메모 ({notes.length}개)
      </div>

      {notes.length === 0 ? (
        <p
          style={{
            textAlign: 'center',
            padding: 20,
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
          }}
        >
          아직 메모가 없습니다. 위에서 추가해보세요!
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {notes.map((n) => (
            <div
              key={n.id}
              style={{
                background: COLOR_MAP[n.color] || COLOR_MAP[''],
                borderRadius: 8,
                padding: 12,
                minWidth: 140,
                maxWidth: 200,
                position: 'relative',
                fontSize: '0.85rem',
                color: '#333',
                boxShadow: '2px 3px 10px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingRight: 20 }}>
                {n.text}
              </div>
              <button
                onClick={() => deleteNote(n.id)}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(0,0,0,0.4)',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}