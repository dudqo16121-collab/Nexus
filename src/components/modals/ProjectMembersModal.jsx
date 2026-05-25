// components/modals/ProjectMembersModal.jsx
// 원본 #project-members-modal + openProjectMembersModal + addMember + removeMember 의 React 이관.
//
// stand-alone. 부모가 projectId 와 allUsers 를 넘겨준다.
//  - projectId: 현재 선택된 프로젝트
//  - allUsers : 검색 후보 (원본 PM.allUsers 와 동일 형태 — { id, name, avatar_url, avatar })
//
// 멤버 목록은 모달 열릴 때마다 자체 fetch — 추가/제거 후에도 재조회.

import { useCallback, useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const toast = (msg, type = 'success') => {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  } else {
    console.log(`[toast/${type}]`, msg);
  }
};

/* 원본 assigneeAvatar 이관 */
function assigneeAvatar(u) {
  if (u?.avatar_url) return u.avatar_url;
  if (u?.avatar)     return `https://i.pravatar.cc/150?img=${u.avatar}`;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

export default function ProjectMembersModal({ isOpen, onClose, projectId, allUsers = [] }) {
  const { user } = useAuth();

  /* 현재 멤버: [{ user_id, role }] */
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  /* 멤버 목록 조회 */
  const loadMembers = useCallback(async () => {
    if (!projectId) { setMembers([]); return; }
    if (!user) { setMembers([]); return; } // 데모 모드 — 로컬 멤버 개념 없음
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId);
      if (error) throw error;
      setMembers(data || []);
    } catch (e) {
      console.error('[ProjectMembers] load error:', e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  /* 열릴 때마다 / projectId 바뀔 때마다 재조회 */
  useEffect(() => {
    if (isOpen) {
      setKeyword('');
      loadMembers();
    }
  }, [isOpen, loadMembers]);

  /* 멤버 추가 */
  const handleAdd = async (userId) => {
    if (!user || !projectId) return;
    try {
      const { error } = await supabase.from('project_members').insert([
        { project_id: projectId, user_id: userId, role: 'member' },
      ]);
      if (error) throw error;
      toast('멤버가 추가되었습니다.');
      setKeyword('');
      loadMembers();
    } catch (e) {
      console.error('[ProjectMembers] add error:', e);
      toast('추가 실패 (이미 멤버일 수 있음)', 'warning');
    }
  };

  /* 멤버 제거 */
  const handleRemove = async (userId) => {
    if (!user || !projectId) return;
    if (!window.confirm('이 멤버를 제거하시겠습니까?')) return;
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);
      if (error) throw error;
      loadMembers();
    } catch (e) {
      console.error('[ProjectMembers] remove error:', e);
      toast('제거 실패', 'error');
    }
  };

  /* 검색 후보 — 멤버가 아닌 사용자 중 키워드 매칭, 5명까지 */
  const kw = keyword.trim().toLowerCase();
  const candidates = !kw
    ? []
    : allUsers
        .filter((u) => (u.name || '').toLowerCase().includes(kw))
        .filter((u) => !members.some((m) => m.user_id === u.id))
        .slice(0, 5);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="멤버 관리">
      <div className="pm-form">
        <label>사용자 검색</label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="이름 또는 이메일"
        />

        {/* 검색 결과 */}
        <div className="pm-member-result">
          {kw && (
            candidates.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 10 }}>결과 없음</div>
              : candidates.map((u) => (
                  <div key={u.id} className="pm-member-row">
                    <div
                      className="avatar"
                      style={{
                        backgroundImage: `url('${assigneeAvatar(u)}')`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                      }}
                    />
                    <div className="name">{u.name}</div>
                    <button
                      type="button"
                      onClick={() => handleAdd(u.id)}
                      style={{ color: 'var(--primary-color)' }}
                      title="추가"
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  </div>
                ))
          )}
        </div>

        <label style={{ marginTop: 18 }}>현재 멤버</label>
        <div className="pm-member-list">
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 14 }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />
              불러오는 중...
            </div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 14 }}>
              멤버가 없습니다.
            </div>
          ) : (
            members.map((m) => {
              const u = allUsers.find((x) => x.id === m.user_id);
              return (
                <div key={m.user_id} className="pm-member-row">
                  <div
                    className="avatar"
                    style={{
                      backgroundImage: `url('${u ? assigneeAvatar(u) : assigneeAvatar({ id: m.user_id })}')`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }}
                  />
                  <div className="name">{u ? u.name : m.user_id.slice(0, 8)}</div>
                  <div className="role">{m.role}</div>
                  {m.role !== 'owner' && (
                    <button type="button" onClick={() => handleRemove(m.user_id)} title="제거">
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="modal-buttons">
        <button className="btn btn-out" type="button" onClick={onClose}>닫기</button>
      </div>
    </Modal>
  );
}
