import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useKanban } from '../../contexts/KanbanContext';
import { useToast } from '../../contexts/ToastContext';

/**
 * 카드 추가 모달
 * 
 * Props:
 *   - isOpen: 모달 표시 여부
 *   - onClose: 닫기 핸들러
 *   - initialColumn: 기본 선택 컬럼 (빠른 추가 시 그 컬럼 미리 선택)
 */
export default function AddCardModal({ isOpen, onClose, initialColumn = 'todo' }) {
  const toast = useToast();
  const { columns, addCard } = useKanban();

  /* 폼 상태 */
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('mid');
  const [columnId, setColumnId] = useState(initialColumn);

  /* 모달이 열릴 때마다 폼 초기화 + initialColumn 반영 */
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAssignee('');
      setPriority('mid');
      setColumnId(initialColumn);
    }
  }, [isOpen, initialColumn]);

  /* 저장 */
  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.warning('제목을 입력해 주세요.');
      return;
    }

    addCard(columnId, {
      title: trimmedTitle,
      assignee: assignee.trim() || '미지정',
      priority,
    });

    onClose();
  };

  /* Enter 키로 저장 */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      handleSubmit();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={
        <>
          <i className="fa-solid fa-plus" style={{ color: 'var(--primary-color)' }}></i>
          새 카드 추가
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onKeyDown={handleKeyDown}>
        <div className="form-group">
          <label className="form-label">제목 *</label>
          <input
            type="text"
            className="form-input"
            placeholder="카드 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">담당자</label>
          <input
            type="text"
            className="form-input"
            placeholder="담당자 이름"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">우선순위</label>
          <select
            className="form-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="high">🔴 높음</option>
            <option value="mid">🟡 보통</option>
            <option value="low">🔵 낮음</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">컬럼</label>
          <select
            className="form-select"
            value={columnId}
            onChange={(e) => setColumnId(e.target.value)}
          >
            {Object.entries(columns).map(([id, col]) => (
              <option key={id} value={id}>
                {col.label}
              </option>
            ))}
          </select>
        </div>

        <button className="btn-primary" onClick={handleSubmit}>
          추가하기
        </button>
      </div>
    </Modal>
  );
}