// components/groupware/StandupEditorModal.jsx
// 스탠드업 작성 모달.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useStandup } from '../../contexts/StandupContext';
import { useToast } from '../../contexts/ToastContext';

export default function StandupEditorModal() {
  const toast = useToast();
  const { editorOpen, closeEditor, saveStandup, myToday } = useStandup();

  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  const [blocker, setBlocker] = useState('');
  const [saving, setSaving] = useState(false);

  /* 열릴 때 기존 작성 내용 로드 */
  useEffect(() => {
    if (!editorOpen) return;
    setYesterday(myToday?.yesterday || '');
    setToday(myToday?.today || '');
    setBlocker(myToday?.blocker || '');
  }, [editorOpen, myToday]);

  const handleSave = async () => {
    if (!today.trim()) {
      toast.warning('오늘 할 일은 꼭 적어주세요.');
      return;
    }
    setSaving(true);
    const res = await saveStandup({ yesterday, today, blocker });
    setSaving(false);
    if (res.ok) {
      toast.success(myToday ? '스탠드업을 수정했어요.' : '스탠드업을 작성했어요!');
      closeEditor();
    } else {
      toast.error(res.error || '저장 실패');
    }
  };

  return (
    <Modal
      isOpen={editorOpen}
      onClose={closeEditor}
      size="md"
      title={myToday ? '오늘 스탠드업 수정' : '오늘 스탠드업 작성'}
    >
      <div className="standup-form">
        <label className="standup-label">
          <i className="fa-solid fa-clock-rotate-left" style={{ color: '#94a3b8' }} />
          어제 한 일
        </label>
        <textarea
          rows={3}
          value={yesterday}
          onChange={(e) => setYesterday(e.target.value)}
          placeholder="어제 처리한 주요 업무를 적어주세요."
          className="standup-textarea"
        />

        <label className="standup-label">
          <i className="fa-solid fa-bullseye" style={{ color: '#06d6a0' }} />
          오늘 할 일 <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <textarea
          rows={3}
          value={today}
          onChange={(e) => setToday(e.target.value)}
          placeholder="오늘 처리할 일을 적어주세요."
          className="standup-textarea"
        />

        <label className="standup-label">
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f72585' }} />
          블로커 / 도움 요청
        </label>
        <textarea
          rows={2}
          value={blocker}
          onChange={(e) => setBlocker(e.target.value)}
          placeholder="진행을 막고 있는 이슈나 동료의 도움이 필요한 일이 있나요?"
          className="standup-textarea"
        />

        <p className="standup-note">
          <i className="fa-solid fa-circle-info" /> 작성한 스탠드업은 전사 동료들이 확인할 수 있어요.
        </p>
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={closeEditor} disabled={saving}>
          취소
        </button>
        <button type="button" className="btn btn-in" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : <><i className="fa-solid fa-paper-plane" /> {myToday ? '수정' : '작성'}</>}
        </button>
      </div>
    </Modal>
  );
}