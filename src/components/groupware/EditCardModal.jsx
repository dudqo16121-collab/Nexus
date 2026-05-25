import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useKanban } from '../../contexts/KanbanContext';
import { useToast } from '../../contexts/ToastContext';

/**
 * 카드 수정 모달
 * 
 * Props:
 *   - isOpen: 모달 표시 여부
 *   - onClose: 닫기 핸들러
 *   - card: 수정할 카드 객체 ({ id, title, assignee, priority })
 *   - columnId: 현재 카드가 있는 컬럼 ID
 */
export default function EditCardModal({ isOpen, onClose, card, columnId }) {
  const toast = useToast();
  const { columns, updateCard, moveCard, deleteCard } = useKanban();

  /* 폼 상태 */
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('mid');
  const [targetColumn, setTargetColumn] = useState(columnId);

  /* 모달이 열릴 때마다 기존 카드 값으로 폼 채우기 */
  useEffect(() => {
    if (isOpen && card) {
      setTitle(card.title || '');
      setAssignee(card.assignee || '');
      setPriority(card.priority || 'mid');
      setTargetColumn(columnId);
    }
  }, [isOpen, card, columnId]);

  /* 저장 */
  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.warning('제목을 입력해 주세요.');
      return;
    }

    /* 1) 카드 내용 업데이트 */
    updateCard(columnId, card.id, {
      title: trimmedTitle,
      assignee: assignee.trim() || '미지정',
      priority,
    });

    /* 2) 컬럼이 바뀐 경우 이동 */
    if (targetColumn !== columnId) {
      moveCard(card.id, columnId, targetColumn);
    }

    onClose();
  };

  /* 삭제 */
  const handleDelete = () => {
    if (!window.confirm(`"${card.title}" 카드를 삭제하시겠습니까?`)) return;
    deleteCard(columnId, card.id);
    onClose();
  };

  /* Enter 키로 저장 */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      handleSubmit();
    }
  };

  /* card가 없으면 렌더링 안 함 (방어 코드) */
  if (!card) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={
        <>
          <i className="fa-solid fa-pen-to-square" style={{ color: 'var(--primary-color)' }}></i>
          카드 상세 / 수정
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onKeyDown={handleKeyDown}>
        <div className="form-group">
          <label className="form-label">제목 *</label>
          <input
            type="text"
            className="form-input"
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
            value={targetColumn}
            onChange={(e) => setTargetColumn(e.target.value)}
          >
            {Object.entries(columns).map(([id, col]) => (
              <option key={id} value={id}>
                {col.label}
              </option>
            ))}
          </select>
        </div>

        {/* 저장 + 삭제 버튼 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="btn-primary" style={{ flex: 2 }} onClick={handleSubmit}>
            <i className="fa-solid fa-floppy-disk" style={{ marginRight: 6 }}></i>
            저장
          </button>
          <button className="btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={handleDelete}>
            <i className="fa-solid fa-trash"></i>
            삭제
          </button>
        </div>
      </div>
    </Modal>
  );
}