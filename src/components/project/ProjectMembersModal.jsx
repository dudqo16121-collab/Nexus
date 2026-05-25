// components/project/ProjectMembersModal.jsx
// 원본 #project-members-modal + openProjectMembersModal + addMember + removeMember 이관.
// 다른 프로젝트 모달들과 일관성 — ProjectContext 기반.
//
// 동작:
//  - 열릴 때 / projectId 변경 시 / 추가·제거 후 → 멤버 목록 재조회
//  - 검색은 ProjectContext.allUsers 에서 클라이언트 필터 (원본과 동일)
//  - owner 역할은 제거 버튼 숨김

import { useCallback, useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';

/* 원본 assigneeAvatar 이관 */
function assigneeAvatar(u) {
  if (u?.avatar_url) return u.avatar_url;
  if (u?.avatar) return `https://i.pravatar.cc/150?img=${u.avatar}`;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

export default function ProjectMembersModal() {
  const toast = useToast();
  const {
    membersModalOpen,
    closeMembersModal,
    selectedProjectId,
    allUsers,
    fetchProjectMembers,
    addProjectMember,
    removeProjectMember,
  } = useProject();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  /* 멤버 목록 로드 */
  const reload = useCallback(async () => {
    if (!selectedProjectId) {
      setMembers([]);
      return;
    }
    setLoading(true);
    const data = await fetchProjectMembers(selectedProjectId);
    setMembers(data);
    setLoading(false);
  }, [selectedProjectId, fetchProjectMembers]);

  /* 모달 열릴 때 초기화 + 로드 */
  useEffect(() => {
    if (membersModalOpen) {
      setKeyword('');
      reload();
    }
  }, [membersModalOpen, reload]);

  /* 추가 */
  const { refresh } = useProject();  // 위 destructure에 refresh 추가

  const handleAdd = async (userId) => {
    const res = await addProjectMember(selectedProjectId, userId);
    if (res.ok) {
      setKeyword('');
      reload();
      /* 초대받은 사람 이름으로 토스트 — 초대자에게 피드백 */
      const invited = allUsers.find((u) => u.id === userId);
      toast.success(`${invited?.name || '멤버'}를 초대했어요`);
    } else {
      toast.error(res.error);
    }
  };

  /* 제거 */
  const handleRemove = async (userId) => {
    if (!window.confirm('이 멤버를 제거하시겠습니까?')) return;
    const res = await removeProjectMember(selectedProjectId, userId);
    if (res.ok) {
      reload();
    } else {
      toast.success(res.error);
    }
  };

  /* 검색 후보 — 현재 멤버 제외, 키워드 매칭, 최대 5명 */
  const kw = keyword.trim().toLowerCase();
  const candidates = !kw
    ? []
    : allUsers
        .filter((u) => (u.name || '').toLowerCase().includes(kw))
        .filter((u) => !members.some((m) => m.user_id === u.id))
        .slice(0, 5);

  return (
    <Modal
      isOpen={membersModalOpen}
      onClose={closeMembersModal}
      size="sm"
      title="멤버 관리"
    >
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
          {kw &&
            (candidates.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 10 }}>
                결과 없음
              </div>
            ) : (
              candidates.map((u) => (
                <div key={u.id} className="pm-member-row">
                  <div
                    className="avatar"
                    style={{
                      backgroundImage: `url('${assigneeAvatar(u)}')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
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
            ))}
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
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
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
        <button type="button" className="btn btn-out" onClick={closeMembersModal}>
          닫기
        </button>
      </div>
    </Modal>
  );
}