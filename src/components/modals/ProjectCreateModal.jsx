// components/modals/ProjectCreateModal.jsx
// 원본 #project-create-modal + openProjectCreateModal + saveNewProject 의 React 이관.
//
// stand-alone 컴포넌트 — 다음 대화에서 받을 ProjectContext/Project 페이지에 import 해서 쓴다.
// 부모가 onCreated(createdProject) 콜백으로 결과를 받는 구조.
//
// 원본 거동 유지:
//  - 프로젝트명 필수.
//  - 컬러 피커: 6개 고정 색상, 클릭으로 선택.
//  - "동일 이름 메신저 채널 자동 생성" 체크박스 — 체크 시 channels/channel_members 에 insert.
//    채널 테이블이 없거나 권한 없으면 조용히 skip (원본 거동).
//  - 데모 모드 (로그인X): 로컬 객체만 생성해서 onCreated 에 넘겨준다.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const COLORS = ['#4361ee', '#f72585', '#ff9f1c', '#4cc9f0', '#06d6a0', '#8338ec'];

const toast = (msg, type = 'success') => {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  } else {
    console.log(`[toast/${type}]`, msg);
  }
};

/* 원본 createMessengerChannel 이관 — 채널 테이블 없으면 조용히 null */
async function createMessengerChannel(name, memberIds, userId) {
  if (!userId) return null;
  try {
    const channelName = '#' + name.replace(/\s+/g, '-').toLowerCase();
    const { data, error } = await supabase
      .from('channels')
      .insert([{ name: channelName, type: 'project', created_by: userId }])
      .select()
      .single();
    if (error) throw error;
    const channelId = data.id;
    if (memberIds?.length) {
      await supabase
        .from('channel_members')
        .insert(memberIds.map((uid) => ({ channel_id: channelId, user_id: uid })));
    }
    return channelId;
  } catch (e) {
    console.warn('[ProjectCreate] createMessengerChannel skipped:', e.message);
    return null;
  }
}

export default function ProjectCreateModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth();

  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus]     = useState('in-progress');
  const [color, setColor]       = useState(COLORS[0]);
  const [startDate, setStart]   = useState('');
  const [endDate, setEnd]       = useState('');
  const [wantChannel, setWantChannel] = useState(true);
  const [saving, setSaving]     = useState(false);

  /* 열릴 때마다 초기화 */
  useEffect(() => {
    if (!isOpen) return;
    setTitle(''); setDesc('');
    setPriority('medium'); setStatus('in-progress');
    setColor(COLORS[0]);
    setStart(''); setEnd('');
    setWantChannel(true);
  }, [isOpen]);

  const handleSave = async () => {
    const t = title.trim();
    if (!t) { toast('프로젝트명을 입력해주세요.', 'warning'); return; }

    setSaving(true);
    const payload = {
      title: t,
      description: desc.trim(),
      priority,
      status,
      color,
      start_date: startDate || null,
      end_date:   endDate   || null,
      progress: 0,
    };

    try {
      // 데모 모드 — 로컬 객체만 만들어 부모에 넘김
      if (!user) {
        const local = { id: 'p_' + Date.now(), ...payload };
        toast('프로젝트가 생성되었습니다.');
        onCreated?.(local);
        onClose();
        return;
      }

      payload.owner_id = user.id;
      const { data, error } = await supabase
        .from('projects')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;

      // 소유자를 멤버로 등록
      await supabase.from('project_members').insert([
        { project_id: data.id, user_id: user.id, role: 'owner' },
      ]);

      // 채널 생성 (옵션)
      if (wantChannel) {
        const channelId = await createMessengerChannel(t, [user.id], user.id);
        if (channelId) {
          await supabase.from('projects').update({ channel_id: channelId }).eq('id', data.id);
          data.channel_id = channelId;
        }
      }

      toast('프로젝트가 생성되었습니다.');
      onCreated?.(data);
      onClose();
    } catch (e) {
      console.error('[ProjectCreate] save error:', e);
      toast('프로젝트 생성 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="새 프로젝트">
      <div className="pm-form">
        <label>프로젝트명 <span className="req">*</span></label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 2026 상반기 모바일 앱 개편"
        />

        <label>설명</label>
        <textarea
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="목표, 범위 등 간단한 설명"
        />

        <div className="pm-form-row">
          <div>
            <label>우선순위</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">🔵 낮음</option>
              <option value="medium">⚪ 보통</option>
              <option value="high">🟠 높음</option>
              <option value="urgent">🔴 긴급</option>
            </select>
          </div>
          <div>
            <label>상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todo">진행 예정</option>
              <option value="in-progress">진행 중</option>
              <option value="done">완료</option>
            </select>
          </div>
        </div>

        <div className="pm-form-row">
          <div>
            <label>컬러</label>
            <div className="pm-color-picker">
              {COLORS.map((c) => (
                <span
                  key={c}
                  className={color === c ? 'active' : ''}
                  data-color={c}
                  style={{ background: c, cursor: 'pointer' }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div />
        </div>

        <div className="pm-form-row">
          <div>
            <label>시작일</label>
            <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label>마감일</label>
            <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <label className="pm-check">
          <input
            type="checkbox"
            checked={wantChannel}
            onChange={(e) => setWantChannel(e.target.checked)}
          />
          <span>동일 이름의 메신저 채널 자동 생성</span>
        </label>
      </div>

      <div className="modal-buttons">
        <button className="btn btn-out" type="button" onClick={onClose} disabled={saving}>취소</button>
        <button className="btn btn-in" type="button" onClick={handleSave} disabled={saving}>
          {saving ? '생성 중...' : '생성하기'}
        </button>
      </div>
    </Modal>
  );
}
