// contexts/TrainingContext.jsx
// 교육/연수 관리 데이터 로직.

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const TrainingContext = createContext(null);

export const CATEGORIES = [
  { id: 'job',        label: '직무역량',   icon: 'fa-briefcase',     color: '#4361ee' },
  { id: 'leadership', label: '리더십',     icon: 'fa-users-rays',    color: '#f72585' },
  { id: 'language',   label: '어학',       icon: 'fa-language',      color: '#06d6a0' },
  { id: 'it',         label: 'IT',         icon: 'fa-laptop-code',   color: '#8338ec' },
  { id: 'safety',     label: '안전보건',   icon: 'fa-helmet-safety', color: '#ff9f1c' },
  { id: 'etc',        label: '기타',       icon: 'fa-shapes',        color: '#64748b' },
];

export const STATUS_META = {
  pending:   { label: '신청 대기',  color: '#f59e0b', icon: 'fa-clock' },
  approved:  { label: '승인됨',    color: '#10b981', icon: 'fa-check' },
  rejected:  { label: '반려됨',    color: '#ef4444', icon: 'fa-xmark' },
  completed: { label: '이수 완료', color: '#4361ee', icon: 'fa-trophy' },
};

export function TrainingProvider({ children }) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const { createNotification } = useNotification();

  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]); // {course_id, status, ...}
  const [allEnrollments, setAllEnrollments] = useState([]); // 관리자만
  const [loading, setLoading] = useState(true);

  /* 필터 */
  const [filter, setFilter] = useState('open'); // open | mine | all
  const [categoryFilter, setCategoryFilter] = useState(null); // null = 전체

  /* 모달 */
  const [detailModal, setDetailModal] = useState({ open: false, courseId: null });
  const [editorModal, setEditorModal] = useState({ open: false, course: null });

  /* fetch */
  const fetchCourses = useCallback(async () => {
    const { data, error } = await supabase
      .from('training_courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[Training] fetchCourses:', error);
      setCourses([]);
    } else setCourses(data || []);
  }, []);

  const fetchMyEnrollments = useCallback(async () => {
    if (!user) { setMyEnrollments([]); return; }
    const { data, error } = await supabase
      .from('training_enrollments')
      .select('*')
      .eq('user_id', user.id);
    if (error) {
      console.error('[Training] fetchMyEnrollments:', error);
      setMyEnrollments([]);
    } else setMyEnrollments(data || []);
  }, [user]);

  const fetchAllEnrollments = useCallback(async () => {
    if (!isAdmin) { setAllEnrollments([]); return; }
    const { data, error } = await supabase
      .from('training_enrollments')
      .select('*');
    if (error) {
      console.error('[Training] fetchAllEnrollments:', error);
      setAllEnrollments([]);
    } else setAllEnrollments(data || []);
  }, [isAdmin]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCourses(), fetchMyEnrollments(), fetchAllEnrollments()]);
    setLoading(false);
  }, [fetchCourses, fetchMyEnrollments, fetchAllEnrollments]);

  useEffect(() => { refresh(); }, [refresh]);

  /* 보여줄 과정 목록 */
  const visibleCourses = useMemo(() => {
    let list = courses;
    if (filter === 'open') {
      list = list.filter((c) => c.status === 'open');
    } else if (filter === 'mine') {
      const myIds = new Set(myEnrollments.map((e) => e.course_id));
      list = list.filter((c) => myIds.has(c.id));
    }
    // 'all' = 모든 상태(보관 포함) — 관리자에게만 의미

    if (categoryFilter) {
      list = list.filter((c) => c.category === categoryFilter);
    }
    return list;
  }, [courses, filter, myEnrollments, categoryFilter]);

  /* 통계 */
  const stats = useMemo(() => {
    const myCompleted = myEnrollments.filter((e) => e.status === 'completed').length;
    const myActive    = myEnrollments.filter((e) => e.status === 'approved').length;
    const myPending   = myEnrollments.filter((e) => e.status === 'pending').length;
    return {
      totalCourses: courses.length,
      openCourses:  courses.filter((c) => c.status === 'open').length,
      myCompleted,
      myActive,
      myPending,
    };
  }, [courses, myEnrollments]);

  /* 내 신청 상태 조회 */
  const getMyEnrollment = useCallback(
    (courseId) => myEnrollments.find((e) => e.course_id === courseId) || null,
    [myEnrollments]
  );

  /* 특정 과정 신청자 (관리자용) */
  const getCourseEnrollments = useCallback(
    (courseId) => allEnrollments.filter((e) => e.course_id === courseId),
    [allEnrollments]
  );

  /* 액션 — 신청 */
  const applyToCourse = useCallback(async (courseId, note = '') => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    try {
      const { data, error } = await supabase
        .from('training_enrollments')
        .insert([{ course_id: courseId, user_id: user.id, note }])
        .select()
        .single();
      if (error) throw error;
      setMyEnrollments((prev) => [...prev, data]);
      return { ok: true };
    } catch (e) {
      console.error('[Training] applyToCourse:', e);
      return { ok: false, error: e.code === '23505' ? '이미 신청한 과정이에요.' : (e.message || '신청 실패') };
    }
  }, [user]);

  /* 액션 — 신청 취소 (pending 만) */
  const cancelMyEnrollment = useCallback(async (enrollmentId) => {
    try {
      const { error } = await supabase
        .from('training_enrollments')
        .delete()
        .eq('id', enrollmentId);
      if (error) throw error;
      setMyEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || '취소 실패' };
    }
  }, []);

  /* 액션 — 관리자: 승인/반려/이수처리 */
  const decideEnrollment = useCallback(async (enrollmentId, newStatus) => {
    if (!isAdmin || !user) return { ok: false, error: '권한이 없습니다.' };
    try {
      const { data, error } = await supabase
        .from('training_enrollments')
        .update({
          status: newStatus,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
        })
        .eq('id', enrollmentId)
        .select()
        .single();
      if (error) throw error;
      setAllEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? data : e))
      );
      /* 본인 행이면 myEnrollments 도 동기화 */
      setMyEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? data : e))
      );
      
            if (error) throw error;
      setAllEnrollments((prev) => prev.map((e) => (e.id === enrollmentId ? data : e)));
      setMyEnrollments((prev) => prev.map((e) => (e.id === enrollmentId ? data : e)));

      /* 알림 — 신청자에게 */
      const course = courses.find((c) => c.id === data.course_id);
      const courseTitle = course?.title || '교육 과정';
      const statusLabel =
        newStatus === 'approved'  ? '승인되었어요' :
        newStatus === 'rejected'  ? '반려되었어요' :
        newStatus === 'completed' ? '이수 처리되었어요' : '상태가 변경되었어요';
      createNotification({
        toUserId: data.user_id,
        type: 'training',
        title: `교육 신청이 ${statusLabel}`,
        body: courseTitle,
        link: '/training',
        refId: data.course_id,
      });

      return { ok: true };
    } catch (e) {
      console.error('[Training] decideEnrollment:', e);
      return { ok: false, error: e.message || '처리 실패' };
    }
  }, [isAdmin, user]);

  /* 액션 — 관리자: 과정 CRUD */
const createCourse = useCallback(async (payload) => {
  if (!isAdmin || !user) return { ok: false, error: '권한이 없습니다.' };
  try {
    const row = {
      title: (payload.title || '').trim() || '새 교육 과정',
      description: payload.description || '',
      category: payload.category || 'etc',
      instructor: payload.instructor || '',
      capacity: parseInt(payload.capacity, 10) || 20,
      
      // 💡 이 부분을 빈 문자열이면 null이 들어가도록 수정합니다.
      start_date: payload.start_date.trim() ? payload.start_date : null,
      end_date: payload.end_date.trim() ? payload.end_date : null,
      
      location: payload.location || '',
      status: payload.status || 'open',
      created_by: user.id,
    };
    
    const { data, error } = await supabase
      .from('training_courses')
      .insert([row])
      .select()
      .single();
      
    if (error) throw error;
    setCourses((prev) => [data, ...prev]);
    return { ok: true, course: data };
  } catch (e) {
    console.error('[Training] createCourse:', e);
    return { ok: false, error: e.message || '생성 실패' };
  }
}, [isAdmin, user]);

  const updateCourse = useCallback(async (id, updates) => {
    if (!isAdmin) return { ok: false, error: '권한이 없습니다.' };
    try {
      const { data, error } = await supabase
        .from('training_courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setCourses((prev) => prev.map((c) => (c.id === id ? data : c)));
      return { ok: true, course: data };
    } catch (e) {
      return { ok: false, error: e.message || '수정 실패' };
    }
  }, [isAdmin]);

  const deleteCourse = useCallback(async (id) => {
    if (!isAdmin) return { ok: false, error: '권한이 없습니다.' };
    try {
      const { error } = await supabase.from('training_courses').delete().eq('id', id);
      if (error) throw error;
      setCourses((prev) => prev.filter((c) => c.id !== id));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || '삭제 실패' };
    }
  }, [isAdmin]);

  /* 모달 제어 */
  const openDetail  = useCallback((courseId) => setDetailModal({ open: true, courseId }), []);
  const closeDetail = useCallback(() => setDetailModal({ open: false, courseId: null }), []);
  const openEditor  = useCallback((course = null) => setEditorModal({ open: true, course }), []);
  const closeEditor = useCallback(() => setEditorModal({ open: false, course: null }), []);

  return (
    <TrainingContext.Provider value={{
      isAdmin,
      /* 데이터 */
      courses, myEnrollments, allEnrollments,
      visibleCourses, stats, loading,
      getMyEnrollment, getCourseEnrollments,
      /* 필터 */
      filter, setFilter,
      categoryFilter, setCategoryFilter,
      /* 액션 */
      applyToCourse, cancelMyEnrollment, decideEnrollment,
      createCourse, updateCourse, deleteCourse,
      refresh,
      /* 모달 */
      detailModal, openDetail, closeDetail,
      editorModal, openEditor, closeEditor,
    }}>
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error('useTraining must be used within TrainingProvider');
  return ctx;
}