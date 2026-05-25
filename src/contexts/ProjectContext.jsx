// contexts/ProjectContext.jsx
// 프로젝트 관리 데이터 로직 단일 출처.
// 원본 script.js 의 PM 글로벌 객체 + fetchProjects / fetchTasks / fetchAllUsers /
// fetchTaskComments / selectProject / saveNewProject / updateProject /
// deleteProject / openQuickAddTask / saveTaskChanges / deleteTask / moveTask /
// postTaskComment 를 React 상태로 이관.
//
// 단계별 구현 메모:
//   1단계: 데이터 fetch + 선택 상태 + 필터/검색
//   2단계: 프로젝트 CRUD + 생성/수정 모달
//   3단계 (현재): 태스크 CRUD + 칸반 + 태스크 슬라이드 패널 + 댓글
//   (이번 이관 범위에서 채팅 채널 자동 생성 / 대시보드 위젯 연동 /
//    멤버 초대 / 멘션 자동완성 UI 는 제외)

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useAuth } from './AuthContext';
import { useMessenger } from './MessengerContext';
import { supabase } from '../lib/supabase';
import { isUuid } from '../config/projectConfig';
import { useNotification } from './NotificationContext';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { user } = useAuth();
  const { open: openMessenger } = useMessenger();

  const { createNotification, createBulkNotifications } = useNotification();

  /* ── 원본 데이터 ── */
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [myMemberProjectIds, setMyMemberProjectIds] = useState(() => new Set());

  /* ── 선택/필터 상태 ── */
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [sideFilter, setSideFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ── 사용자 목록 로드 — 원본 fetchAllUsers 이관 ── */
  const fetchAllUsers = useCallback(async () => {
    if (!user) {
      setAllUsers([]);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .limit(200);
      if (err) throw err;
      const mapped = (data || []).map((u) => ({
        id: u.id,
        name: u.full_name || '이름 없음',
        avatar_url: u.avatar_url,
      }));
      if (mountedRef.current) setAllUsers(mapped);
    } catch (e) {
      console.error('[ProjectContext.fetchAllUsers]', e);
      if (mountedRef.current) setAllUsers([]);
    }
  }, [user]);

  /* ── 프로젝트 목록 로드 — 원본 fetchProjects 이관 ── */
  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setMyMemberProjectIds(new Set());
      return;
    }
    try {
      let memberIds = [];
      try {
        const { data: memberRows, error: mErr } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id);
        if (!mErr && memberRows) {
          memberIds = memberRows.map((r) => r.project_id);
        }
      } catch (mE) {
        console.warn('[ProjectContext] project_members 조회 실패', mE);
      }

      let query = supabase
        .from('projects')
        .select('*')
        .eq('archived', false);

      if (memberIds.length > 0) {
        const idList = memberIds.map((id) => `"${id}"`).join(',');
        query = query.or(`owner_id.eq.${user.id},id.in.(${idList})`);
      } else {
        query = query.eq('owner_id', user.id);
      }

      const { data, error: err } = await query.order('created_at', {
        ascending: false,
      });
      if (err) throw err;

      if (!mountedRef.current) return;
      setProjects(data || []);
      setMyMemberProjectIds(new Set(memberIds));
    } catch (e) {
      console.error('[ProjectContext.fetchProjects]', e);
      if (mountedRef.current) {
        setError(e.message || '프로젝트 로드 실패');
        setProjects([]);
        setMyMemberProjectIds(new Set());
      }
    }
  }, [user]);

  /* ── 특정 프로젝트의 태스크 로드 — 원본 fetchTasks 이관 ── */
  const fetchTasks = useCallback(async (projectId) => {
    if (!projectId) {
      setTasks([]);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });
      if (err) throw err;
      if (mountedRef.current) setTasks(data || []);
    } catch (e) {
      console.error('[ProjectContext.fetchTasks]', e);
      if (mountedRef.current) setTasks([]);
    }
  }, []);

  /* ── 태스크 댓글 조회 — 원본 fetchTaskComments 이관 ── */
const fetchTaskComments = useCallback(async (taskId) => {
  if (!user || !isUuid(taskId)) return [];
  try {
    const { data, error: err } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (err) throw err;
    return data || [];
  } catch (e) {
    console.error('[ProjectContext.fetchTaskComments]', e);
    return [];
  }
}, [user]);   // ⭐ 이게 핵심

  /* ── 진입점: 전체 로드 — 원본 loadProjectsFromSupabase 이관 ── */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchAllUsers(), fetchProjects()]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchAllUsers, fetchProjects]);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setTasks([]);
      setAllUsers([]);
      setMyMemberProjectIds(new Set());
      setSelectedProjectId(null);
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
/* ── Realtime: 내가 멤버로 추가/제거될 때 자동 새로고침 ──
     다른 사람이 나를 초대하면 즉시 내 프로젝트 목록에 반영. */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`project_members_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_members',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Project] member change detected:', payload.eventType);
          /* 변경 사항 발생 → 프로젝트 목록 + 멤버 ID 재로드 */
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchProjects]);
  useEffect(() => {
    if (loading) return;
    if (projects.length === 0) return;
    if (selectedProjectId && projects.some((p) => p.id === selectedProjectId)) {
      return;
    }
    setSelectedProjectId(projects[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, projects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(selectedProjectId);
    } else {
      setTasks([]);
    }
  }, [selectedProjectId, fetchTasks]);

  /* ── 2단계: 프로젝트 CRUD + 모달 상태 ────────────────────── */

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalTarget, setEditModalTarget] = useState(null);

  const openCreateModal = useCallback(() => setCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);
  const openEditModal = useCallback((project) => {
    setEditModalTarget(project);
  }, []);
  const closeEditModal = useCallback(() => setEditModalTarget(null), []);

/* ── 원본 createMessengerChannel 이관 ──
     채널 테이블이 없거나 권한 문제일 때 조용히 null 반환. */
  const _createMessengerChannel = useCallback(async (name, memberIds) => {
    if (!user) return null;
    try {
      const channelName = '#' + name.replace(/\s+/g, '-').toLowerCase();
      const { data, error: chErr } = await supabase
        .from('channels')
        .insert([{ name: channelName, type: 'project', created_by: user.id }])
        .select()
        .single();
      if (chErr) throw chErr;
      const channelId = data.id;
      if (memberIds?.length) {
        await supabase
          .from('channel_members')
          .insert(memberIds.map((uid) => ({ channel_id: channelId, user_id: uid })));
      }
      return channelId;
    } catch (e) {
      console.warn('[ProjectContext] createMessengerChannel skipped:', e.message);
      return null;
    }
  }, [user]);

  const createProject = useCallback(
    async (payload) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      const title = (payload.title || '').trim();
      if (!title) return { ok: false, error: '프로젝트명을 입력해주세요.' };

      const row = {
        title,
        description: (payload.description || '').trim(),
        priority: payload.priority || 'medium',
        status: payload.status || 'in-progress',
        color: payload.color || '#4361ee',
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        progress: 0,
        owner_id: user.id,
        archived: false,
      };

      try {
        const { data, error: err } = await supabase
          .from('projects')
          .insert([row])
          .select()
          .single();
        if (err) throw err;

        try {
          await supabase.from('project_members').insert([
            { project_id: data.id, user_id: user.id, role: 'owner' },
          ]);
        } catch (memErr) {
          console.warn('[ProjectContext] project_members insert 실패:', memErr);
        }

        // 채널 자동 생성 — payload.wantChannel === true 일 때만
        if (payload.wantChannel) {
          const channelId = await _createMessengerChannel(title, [user.id]);
          if (channelId) {
            try {
              await supabase
                .from('projects')
                .update({ channel_id: channelId })
                .eq('id', data.id);
              data.channel_id = channelId;
            } catch (updErr) {
              console.warn('[ProjectContext] channel_id update 실패:', updErr);
            }
          }
        }

        if (mountedRef.current) {
          setProjects((prev) => [data, ...prev]);
          setSelectedProjectId(data.id);
          setMyMemberProjectIds((prev) => {
            const next = new Set(prev);
            next.add(data.id);
            return next;
          });
        }
        return { ok: true, project: data };
      } catch (e) {
        console.error('[ProjectContext.createProject]', e);
        return { ok: false, error: e.message || '프로젝트 생성 실패' };
      }
    },
    [user, _createMessengerChannel]
  );

/* ── 프로젝트 완료 처리 + 보고서 생성 ── */
/* ── 프로젝트 수정 — 원본 updateProject 이관 ── */
  const updateProject = useCallback(
    async (id, updates) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      const title = (updates.title || '').trim();
      if (!title) return { ok: false, error: '프로젝트명은 필수입니다.' };

      const patch = {
        title,
        description: (updates.description || '').trim(),
        priority: updates.priority,
        status: updates.status,
        start_date: updates.start_date || null,
        end_date: updates.end_date || null,
      };

      try {
        const { error: err } = await supabase
          .from('projects')
          .update(patch)
          .eq('id', id);
        if (err) throw err;

        if (mountedRef.current) {
          setProjects((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
          );
        }
        return { ok: true };
      } catch (e) {
        console.error('[ProjectContext.updateProject]', e);
        return { ok: false, error: e.message || '수정 실패' };
      }
    },
    [user]
  );

  /* ── 프로젝트 완료 처리 + 보고서 생성 ── */
  const completeProject = useCallback(
    async (projectId, initialReport, snapshot) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      const project = projects.find((p) => p.id === projectId);
      if (!project) return { ok: false, error: '프로젝트를 찾을 수 없어요.' };
      if (project.status === 'completed') {
        return { ok: false, error: '이미 완료된 프로젝트예요.' };
      }

      try {
        const completedAt = new Date().toISOString();
        const completedByName =
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          '익명';

        const { error: e1 } = await supabase
          .from('projects')
          .update({
            status: 'completed',
            progress: 100,
            completed_at: completedAt,
            completed_by: user.id,
            completed_by_name: completedByName,
          })
          .eq('id', projectId);
        if (e1) throw e1;

        const { error: e2 } = await supabase
          .from('project_reports')
          .upsert([{
            project_id: projectId,
            ...initialReport,
            snapshot,
            created_by: user.id,
            created_by_name: completedByName,
            updated_at: new Date().toISOString(),
          }], { onConflict: 'project_id' });
        if (e2) throw e2;

        if (mountedRef.current) {
          setProjects((prev) =>
            prev.map((p) => (p.id === projectId
              ? {
                  ...p,
                  status: 'completed',
                  progress: 100,
                  completed_at: completedAt,
                  completed_by: user.id,
                  completed_by_name: completedByName,
                }
              : p
            ))
          );
        }

        try {
          const { data: members } = await supabase
            .from('project_members')
            .select('user_id')
            .eq('project_id', projectId);
          const ids = (members || [])
            .map((m) => m.user_id)
            .filter((id) => id && id !== user.id);
          if (ids.length > 0 && createBulkNotifications) {
            await createBulkNotifications(ids, {
              type: 'project',
              title: '프로젝트가 완료됐어요',
              body: `"${project.title}" 프로젝트가 완료되었습니다. 보고서를 확인해보세요.`,
              link: `/project?id=${projectId}`,
              refId: projectId,
            });
          }
        } catch (notifErr) {
          console.warn('[completeProject] notification:', notifErr);
        }

        return { ok: true };
      } catch (e) {
        console.error('[ProjectContext.completeProject]', e);
        return { ok: false, error: e.message || '완료 처리 실패' };
      }
    },
    [user, projects, createBulkNotifications]
  );

  /* ── 보고서 가져오기 ── */
  const fetchProjectReport = useCallback(
    async (projectId) => {
      try {
        const { data, error: err } = await supabase
          .from('project_reports')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();
        if (err) throw err;
        return { ok: true, report: data };
      } catch (e) {
        console.error('[ProjectContext.fetchProjectReport]', e);
        return { ok: false, error: e.message };
      }
    },
    []
  );

  /* ── 보고서 수정 ── */
  const updateProjectReport = useCallback(
    async (projectId, patch) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const { error: err } = await supabase
          .from('project_reports')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('project_id', projectId);
        if (err) throw err;
        return { ok: true };
      } catch (e) {
        console.error('[ProjectContext.updateProjectReport]', e);
        return { ok: false, error: e.message };
      }
    },
    [user]
  );

  /* ── 완료 모달 상태 ── */
  const [completeModalTarget, setCompleteModalTarget] = useState(null);
  const openCompleteModal = useCallback((project) => {
    setCompleteModalTarget(project);
  }, []);
  const closeCompleteModal = useCallback(() => setCompleteModalTarget(null), []);

  /* ── 보고서 모달 상태 ── */
  const [reportModalTarget, setReportModalTarget] = useState(null);
  const openReportModal = useCallback((project) => {
    setReportModalTarget(project);
  }, []);
  const closeReportModal = useCallback(() => setReportModalTarget(null), []);
  
  const deleteProject = useCallback(
    async (id) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const { error: err } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);
        if (err) throw err;

        if (mountedRef.current) {
          setProjects((prev) => prev.filter((p) => p.id !== id));
          if (selectedProjectId === id) setSelectedProjectId(null);
        }
        return { ok: true };
      } catch (e) {
        console.error('[ProjectContext.deleteProject]', e);
        return { ok: false, error: e.message || '삭제 실패' };
      }
    },
    [user, selectedProjectId]
  );
/* ── 채널 열기 — 원본 openProjectChannel 이관 ──
     window.Messenger.selectChannel 이 있으면 호출, 없으면 위젯만 열고 안내.
     원본 폴백 거동과 동일. */
  const openProjectChannel = useCallback(
    (projectId) => {
      const p = projects.find((x) => x.id === projectId);
      if (!p) {
        return { ok: false, error: '프로젝트를 찾을 수 없습니다.' };
      }
      if (!p.channel_id) {
        return { ok: false, error: '연결된 채널이 없습니다.' };
      }
      openMessenger();
      if (typeof window.Messenger?.selectChannel === 'function') {
        window.Messenger.selectChannel(p.channel_id);
        return { ok: true };
      }
      // 폴백 — 위젯만 열림
      return { ok: true, fallback: true, channelName: p.title };
    },
    [projects, openMessenger]
  );

  /* ── 멤버 관리 ────────────────────────────────────────── */
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const openMembersModal = useCallback(() => setMembersModalOpen(true), []);
  const closeMembersModal = useCallback(() => setMembersModalOpen(false), []);

  /* 특정 프로젝트의 현재 멤버 조회 — 원본 openProjectMembersModal 의 fetch 부분 */
  const fetchProjectMembers = useCallback(async (projectId) => {
    if (!user || !projectId) return [];
    try {
      const { data, error: err } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId);
      if (err) throw err;
      return data || [];
    } catch (e) {
      console.error('[ProjectContext.fetchProjectMembers]', e);
      return [];
    }
  }, [user]);

  /* 멤버 추가 — 원본 addMember 이관 */
const addProjectMember = useCallback(
    async (projectId, userId) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const { error: err } = await supabase
          .from('project_members')
          .insert([{ project_id: projectId, user_id: userId, role: 'member' }]);
        if (err) throw err;

        /* 본인이 추가된 경우 — myMemberProjectIds 갱신 */
        if (userId === user.id && mountedRef.current) {
          setMyMemberProjectIds((prev) => {
            const next = new Set(prev);
            next.add(projectId);
            return next;
          });
        }

        /* 🔔 초대받은 사람에게 알림 발송 */
        if (userId !== user.id) {
          const project = projects.find((p) => p.id === projectId);
          if (project) {
            try {
              await createNotification({
                toUserId: userId,
                type: 'project',
                title: '프로젝트에 초대되었어요',
                body: `"${project.title}" 프로젝트의 멤버로 추가되었습니다.`,
                link: `/project?id=${projectId}`,
                refId: projectId,
              });
            } catch (notifErr) {
              console.warn('[addProjectMember] notification failed:', notifErr);
              /* 알림 실패해도 멤버 추가는 성공으로 처리 */
            }
          }
        }

        return { ok: true };
      } catch (e) {
        console.error('[ProjectContext.addProjectMember]', e);
        return { ok: false, error: e.message || '추가 실패 (이미 멤버일 수 있음)' };
      }
    },
    [user, projects, createNotification]
  );

  /* 멤버 제거 — 원본 removeMember 이관 */
  const removeProjectMember = useCallback(
    async (projectId, userId) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const { error: err } = await supabase
          .from('project_members')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', userId);
        if (err) throw err;
        if (userId === user.id && mountedRef.current) {
          setMyMemberProjectIds((prev) => {
            const next = new Set(prev);
            next.delete(projectId);
            return next;
          });
        }
        return { ok: true };
      } catch (e) {
        console.error('[ProjectContext.removeProjectMember]', e);
        return { ok: false, error: e.message || '제거 실패' };
      }
    },
    [user]
  );
  /* ── 3단계: 태스크 CRUD + 슬라이드 패널 상태 + 댓글 ────────── */

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const openTaskPanel = useCallback((taskId) => setSelectedTaskId(taskId), []);
  const closeTaskPanel = useCallback(() => setSelectedTaskId(null), []);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  /* ── 태스크 생성 — 원본 openQuickAddTask 이관 ── */
  const createTask = useCallback(
    async (status, title) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      if (!selectedProjectId)
        return { ok: false, error: '프로젝트를 먼저 선택하세요.' };
      const t = (title || '').trim();
      if (!t) return { ok: false, error: '제목을 입력해주세요.' };

      const payload = {
        project_id: selectedProjectId,
        title: t,
        status,
        priority: 'medium',
        position: tasks.length,
        created_by: user.id,
        user_id: user.id,
      };

      try {
        const { data, error: err } = await supabase
          .from('tasks')
          .insert([payload])
          .select()
          .single();
        if (err) throw err;
        if (mountedRef.current) {
          setTasks((prev) => [...prev, data]);
        }
        return { ok: true, task: data };
      } catch (e) {
        console.error('[ProjectContext.createTask]', e);
        return { ok: false, error: e.message || '태스크 생성 실패' };
      }
    },
    [user, selectedProjectId, tasks.length]
  );

  /* ── 태스크 수정 — 원본 saveTaskChanges 이관 ──
     UUID 가 아닌 임시 ID(데모)면 DB 저장 스킵, 로컬에서만 반영. */
const updateTask = useCallback(
    async (taskId, updates) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      
      // t는 수정되기 전의 기존 태스크 데이터입니다 (prevTask 역할)
      const t = tasks.find((x) => x.id === taskId);
      if (!t) return { ok: false, error: '태스크를 찾을 수 없습니다.' };

      const patch = {
        title: (updates.title || '').trim(),
        status: updates.status,
        priority: updates.priority,
        due_date: updates.due_date || null,
        description: updates.description || '',
        assignee_id: updates.assignee_id || null,
        is_completed: updates.status === 'done',
      };
      if (!patch.title) return { ok: false, error: '제목은 필수입니다.' };

      try {
        if (isUuid(taskId)) {
          const { error: err } = await supabase
            .from('tasks')
            .update(patch)
            .eq('id', taskId);
          if (err) throw err;
        }
        
        if (mountedRef.current) {
          setTasks((prev) =>
            prev.map((x) => (x.id === taskId ? { ...x, ...patch } : x))
          );
        }
        
        /* =========================================
           🔔 담당자 변경 알림 로직 주입 (정형화 완료)
           ========================================= */
        // 새 담당자가 지정되었고, 기존 담당자(t.assignee_id)와 다를 때만 알림 발생
        if (updates.assignee_id && updates.assignee_id !== t?.assignee_id) {
          const taskTitle = patch.title || t?.title || '태스크';
          const projectId = t?.project_id || '';
          
          createNotification({
            toUserId: updates.assignee_id,
            type: 'task',
            title: '태스크가 할당됐어요',
            body: taskTitle,
            link: `/project?id=${projectId}`,
            refId: taskId,
          });
        }
        /* ========================================= */
        
        return { ok: true };
      } catch (e) {
        console.error('[ProjectContext.updateTask]', e);
        return { ok: false, error: e.message || '저장 실패' };
      }
    },
    // 의존성 배열에 createNotification 훅을 누락 없이 추가해 줍니다.
    [user, tasks, createNotification]
  );

  /* ── 태스크 삭제 — 원본 deleteTask 이관 ──
     영구 삭제. UI 에서 window.confirm 후에만 호출할 것. */
  const deleteTask = useCallback(
    async (taskId) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        if (isUuid(taskId)) {
          const { error: err } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);
          if (err) throw err;
        }
        if (mountedRef.current) {
          setTasks((prev) => prev.filter((x) => x.id !== taskId));
          if (selectedTaskId === taskId) setSelectedTaskId(null);
        }
        return { ok: true };
      } catch (e) {
        console.error('[ProjectContext.deleteTask]', e);
        return { ok: false, error: e.message || '삭제 실패' };
      }
    },
    [user, selectedTaskId]
  );

  /* ── 태스크 컬럼 이동 — 원본 moveTask 이관 ──
     낙관적 업데이트: 먼저 로컬 반영 → DB 갱신. 실패 시 롤백. */
  const moveTask = useCallback(
    async (taskId, newStatus) => {
      const t = tasks.find((x) => x.id === taskId);
      if (!t || t.status === newStatus) return { ok: false };

      const patch = { status: newStatus, is_completed: newStatus === 'done' };

      if (mountedRef.current) {
        setTasks((prev) =>
          prev.map((x) => (x.id === taskId ? { ...x, ...patch } : x))
        );
      }

      if (user && isUuid(taskId)) {
        try {
          const { error: err } = await supabase
            .from('tasks')
            .update(patch)
            .eq('id', taskId);
          if (err) throw err;
        } catch (e) {
          console.error('[ProjectContext.moveTask]', e);
          if (mountedRef.current) {
            setTasks((prev) =>
              prev.map((x) => (x.id === taskId ? { ...x, status: t.status } : x))
            );
          }
          return { ok: false, error: e.message };
        }
      }
      return { ok: true };
    },
    [tasks, user]
  );

/* ── 댓글 작성 — 원본 postTaskComment 이관 ──
     실제 DB 스키마에 맞춰 컬럼명 보정:
       body          → content
       mentioned_ids → 컬럼 없음 (스킵, 멘션은 본문 텍스트의 @이름 으로 남음)
       author_id     → 그대로 (스키마에 존재 확인됨)
       user_id       → 동일 사용자 채움 (스키마에 둘 다 있음) */
/* ── ProjectContext.jsx 내의 postTaskComment 함수 수정 ── */

/* ── ProjectContext.jsx 내의 postTaskComment 함수 ── */

/* ProjectContext.jsx 내의 postTaskComment 부분을 이 코드로 덮어쓰세요 */
const postTaskComment = useCallback(
  async (taskId, commentText) => { // 매개변수명을 의미 있게 변경
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    
    const text = (commentText || '').trim();
    if (!text) return { ok: false, error: '내용을 입력해주세요.' };
    
    if (!isUuid(taskId)) {
      return { ok: false, error: '데모 태스크에는 댓글을 저장할 수 없습니다.' };
    }

    try {
      // DB 이미지에 확인된 대로 'content' 컬럼명을 정확히 사용합니다.
      const payload = {
        task_id: taskId,
        content: text,      // 'body'가 아닌 'content'여야 에러가 안 납니다!
        author_id: user.id,
        user_id: user.id,   
      };

      const { data, error: err } = await supabase
        .from('task_comments')
        .insert([payload]) 
        .select()
        .single();

      if (err) throw err;

       /* 멘션 추출 + 알림 */
        const mentionNames = (text.match(/@([\w가-힣]+)/g) || []).map((s) => s.slice(1));
        if (mentionNames.length > 0 && allUsers && allUsers.length > 0) {
          const mentionedIds = allUsers
            .filter((u) => mentionNames.includes(u.name))
            .map((u) => u.id);
          if (mentionedIds.length > 0) {
            const taskTitle = tasks.find((t) => t.id === taskId)?.title || '태스크';
            createBulkNotifications(mentionedIds, {
              type: 'mention',
              title: '댓글에서 멘션됐어요',
              body: `"${taskTitle}" — ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
              link: `/project?id=${data.task_id}`,
              refId: data.id,
            });
          }
        }
        
      return { ok: true, comment: data };
    } catch (e) {
      console.error('[ProjectContext.postTaskComment]', e);
      return { ok: false, error: e.message || '댓글 등록 실패' };
    }
  },
  [user]
);

  /* 선택된 프로젝트 객체 */
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  /* 필터/검색 적용된 프로젝트 리스트 */
  const filteredProjects = useMemo(() => {
    let list = [...projects];

    if (sideFilter === 'mine' && user) {
      list = list.filter(
        (p) => p.owner_id === user.id || myMemberProjectIds.has(p.id)
      );
    } else if (sideFilter === 'active') {
      list = list.filter((p) => p.status === 'in-progress');
    } else if (sideFilter === 'completed') {
      list = list.filter((p) => p.status === 'completed');
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, sideFilter, search, user, myMemberProjectIds]);

 const value = {
    // 데이터
    projects,
    filteredProjects,
    tasks,
    allUsers,
    myMemberProjectIds,
    loading,
    error,
    // 선택 / 필터
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    sideFilter,
    setSideFilter,
    search,
    setSearch,
    // 액션
    refresh,
    fetchTasks,
    fetchTaskComments,
    // 2단계: 프로젝트 CRUD + 모달
    createProject,
    updateProject,
    deleteProject,
    createModalOpen,
    openCreateModal,
    closeCreateModal,
    editModalTarget,
    openEditModal,
    closeEditModal,
    // 프로젝트 완료 + 보고서
    completeProject,
    fetchProjectReport,
    updateProjectReport,
    completeModalTarget,
    openCompleteModal,
    closeCompleteModal,
    reportModalTarget,
    openReportModal,
    closeReportModal,
    // 3단계: 태스크 CRUD + 슬라이드 패널 + 댓글
    selectedTaskId,
    selectedTask,
    openTaskPanel,
    closeTaskPanel,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    postTaskComment,
    // 4단계: 채팅채널 + 멤버 관리
    openProjectChannel,
    fetchProjectMembers,
    addProjectMember,
    removeProjectMember,
    membersModalOpen,
    openMembersModal,
    closeMembersModal,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return ctx;
}