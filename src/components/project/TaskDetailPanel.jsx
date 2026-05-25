// components/project/TaskDetailPanel.jsx
// 태스크 상세 슬라이드 패널 — 원본 #task-detail-panel + openTaskPanel /
// closeTaskPanel / saveTaskChanges / deleteTask / fetchTaskComments /
// renderTaskComments / postTaskComment 이관.
//
// 동작: selectedTaskId 가 set 되면 .open 클래스가 붙어 우측에서 슬라이드 인.
// 메타(상태/우선순위/담당자/마감일) + 설명 + 댓글. 저장 버튼으로 일괄 저장.
//
// 멘션 자동완성 UI 는 이번 이관 범위에서 제외 (텍스트로 @이름 입력 시
// 저장 시점에 mentioned_ids 만 추출).

import { useState, useEffect } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';
import {
  formatRelative,
  escapeHtml,
  mentionsToHtml,
} from '../../utils/projectHelpers';

export default function TaskDetailPanel() {
  const toast = useToast();
  const {
    selectedTaskId,
    selectedTask,
    selectedProject,
    closeTaskPanel,
    updateTask,
    deleteTask,
    fetchTaskComments,
    postTaskComment,
    allUsers,
  } = useProject();

  const open = selectedTaskId != null && selectedTask != null;

  /* 폼 상태 — 패널 열릴 때 task 값으로 초기화 */
  const [form, setForm] = useState({
    title: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    description: '',
    assignee_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  /* 댓글 상태 */
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  /* 패널 열림 시 폼 초기화 + 댓글 로드 */
  useEffect(() => {
    if (!open) return;
    setForm({
      title: selectedTask.title || '',
      status: selectedTask.status || 'todo',
      priority: selectedTask.priority || 'medium',
      due_date: selectedTask.due_date || '',
      description: selectedTask.description || '',
      assignee_id: selectedTask.assignee_id || '',
    });
    setNewComment('');
    setComments([]);

    let cancelled = false;
    setCommentsLoading(true);
    fetchTaskComments(selectedTaskId).then((rows) => {
      if (!cancelled) {
        setComments(rows);
        setCommentsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, selectedTaskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSubmitting(true);
    const result = await updateTask(selectedTaskId, form);
    setSubmitting(false);
    if (result.ok) {
      toast.success('태스크가 저장되었습니다.');
      closeTaskPanel();
    } else {
      toast.error(`저장 실패: ${result.error || ''}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 태스크를 삭제하시겠습니까?')) return;
    setSubmitting(true);
    const result = await deleteTask(selectedTaskId);
    setSubmitting(false);
    if (result.ok) {
      toast.success('삭제되었습니다.');
      closeTaskPanel();
    } else {
      toast.error(`삭제 실패: ${result.error || ''}`);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    const result = await postTaskComment(selectedTaskId, newComment);
    setPostingComment(false);
    if (result.ok) {
      setNewComment('');
      const updated = await fetchTaskComments(selectedTaskId);
      setComments(updated);
    } else {
      toast.error(`댓글 등록 실패: ${result.error || ''}`);
    }
  };

  /* 패널은 항상 마운트하고 .open 클래스로 표시 제어 (원본과 동일).
     selectedTask 가 없을 때도 마운트는 유지, 단 내부는 비움. */
  return (
    <div className={`pm-task-panel ${open ? 'open' : ''}`}>
      {open && (
        <>
          {/* 헤더 — 제목 + 닫기 */}
          <div className="pm-tp-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pm-tp-bread">
                {selectedProject?.title || '프로젝트'} &gt;{' '}
              </div>
              <input
                type="text"
                className="pm-tp-title-input"
                placeholder="태스크 제목"
                value={form.title}
                onChange={(e) => patch('title', e.target.value)}
              />
            </div>
            <button
              type="button"
              className="pm-tp-close"
              onClick={closeTaskPanel}
              title="닫기"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {/* 본문 */}
          <div className="pm-tp-body">
            {/* 메타 */}
            <div className="pm-tp-meta">
              <div className="pm-tp-meta-row">
                <span className="pm-tp-label">
                  <i className="fa-solid fa-flag" /> 상태
                </span>
                <select
                  value={form.status}
                  onChange={(e) => patch('status', e.target.value)}
                >
                  <option value="todo">To Do</option>
                  <option value="doing">진행중</option>
                  <option value="review">리뷰</option>
                  <option value="done">완료</option>
                </select>
              </div>
              <div className="pm-tp-meta-row">
                <span className="pm-tp-label">
                  <i className="fa-solid fa-fire" /> 우선순위
                </span>
                <select
                  value={form.priority}
                  onChange={(e) => patch('priority', e.target.value)}
                >
                  <option value="low">🔵 낮음</option>
                  <option value="medium">⚪ 보통</option>
                  <option value="high">🟠 높음</option>
                  <option value="urgent">🔴 긴급</option>
                </select>
              </div>
              <div className="pm-tp-meta-row">
                <span className="pm-tp-label">
                  <i className="fa-solid fa-user" /> 담당자
                </span>
                <select
                  value={form.assignee_id}
                  onChange={(e) => patch('assignee_id', e.target.value)}
                >
                  <option value="">미지정</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pm-tp-meta-row">
                <span className="pm-tp-label">
                  <i className="fa-solid fa-calendar" /> 마감일
                </span>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => patch('due_date', e.target.value)}
                />
              </div>
            </div>

            {/* 설명 */}
            <div className="pm-tp-section">
              <h4>
                <i className="fa-solid fa-align-left" /> 설명
              </h4>
              <textarea
                rows={4}
                placeholder="태스크 상세 내용..."
                value={form.description}
                onChange={(e) => patch('description', e.target.value)}
              />
            </div>

            {/* 댓글 */}
            <div className="pm-tp-section">
              <h4>
                <i className="fa-regular fa-comments" /> 댓글 · 활동
              </h4>
              <div className="pm-tp-comments">
                {commentsLoading && (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      padding: 20,
                    }}
                  >
                    댓글을 불러오는 중...
                  </div>
                )}

                {!commentsLoading && comments.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      padding: 20,
                    }}
                  >
                    아직 댓글이 없습니다.
                  </div>
                )}

                {!commentsLoading &&
                  comments.map((c) => {
                    const author = allUsers.find((u) => u.id === c.author_id);
                    return (
<div className="pm-tp-comment" key={c.id}>
  <div className="pm-tp-comment-author">
    {author?.name || '사용자'}
  </div>
                        <div
                          className="pm-tp-comment-text"
                          // DB 컬럼은 'content'. 과거 body 컬럼 호환을 위해 폴백.
                          dangerouslySetInnerHTML={{
                            __html: mentionsToHtml(escapeHtml(c.content || c.body || '')),
                          }}
                        />
  <div className="pm-tp-comment-time">
    {formatRelative(c.created_at)}
  </div>
</div>
                    );
                  })}
              </div>

              {/* 댓글 작성 */}
              <div className="pm-tp-comment-input">
                <textarea
                  rows={2}
                  placeholder="댓글 작성... (@이름 으로 멘션)"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="pm-tp-comment-actions">
                  <button
                    type="button"
                    className="btn-text"
                    disabled
                    title="채널에서 논의 (이번 이관 범위 외)"
                    style={{ opacity: 0.4, cursor: 'not-allowed' }}
                  >
                    <i className="fa-regular fa-comment-dots" /> 채널에서 논의
                  </button>
                  <button
                    type="button"
                    className="btn btn-in"
                    onClick={handlePostComment}
                    disabled={postingComment || !newComment.trim()}
                    style={{ width: 'auto', padding: '0 14px', height: 36 }}
                  >
                    <i className="fa-solid fa-paper-plane" />{' '}
                    {postingComment ? '등록 중...' : '등록'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 푸터 — 삭제 + 저장 */}
          <div className="pm-tp-footer">
            <button
              type="button"
              className="btn-text danger"
              onClick={handleDelete}
              disabled={submitting}
            >
              <i className="fa-regular fa-trash-can" /> 태스크 삭제
            </button>
            <button
              type="button"
              className="btn btn-in"
              onClick={handleSave}
              disabled={submitting}
              style={{ width: 'auto', padding: '0 20px' }}
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}