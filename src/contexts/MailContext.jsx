// contexts/MailContext.jsx
// 메일함 데이터 로직.
//
// 폴더: inbox / sent / starred / trash
// 메일 작성 / 답장 / 읽음처리 / 별표 / 삭제 / 영구삭제

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const MailContext = createContext(null);

export function MailProvider({ children }) {
  const { user } = useAuth();
  const { createBulkNotifications } = useNotification();

  /* 폴더 + 검색 + 선택 */
  const [folder, setFolder] = useState('inbox');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [listFilter, setListFilter] = useState('all'); // 'all' | 'unread' | 'starred' | 'attached'
  const [selectedIds, setSelectedIds] = useState(() => new Set()); // 체크박스 선택

  /* 데이터 */
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  /* 작성 모달 */
  const [composeModal, setComposeModal] = useState({
    open: false,
    mode: 'new', // new | reply | forward
    initial: null, // 답장/전달 시 원본 메일
  });

  /* 전체 사용자 fetch (수신자 선택용) */
  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, department')
      .order('full_name');
    if (!error) setAllUsers(data || []);
  }, []);

  /* 받은편지함 fetch */
  const fetchInbox = useCallback(async () => {
    if (!user) { setInbox([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mail_recipients')
        .select(`
          id, read_at, starred, folder, created_at,
          message:mail_messages(
            id, subject, body, sender_id, parent_id, category, created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInbox(data || []);
    } catch (e) {
      console.error('[Mail] fetchInbox:', e);
      setInbox([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /* 보낸편지함 fetch */
  const fetchSent = useCallback(async () => {
    if (!user) { setSent([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mail_messages')
        .select(`
          id, subject, body, sender_id, parent_id, category, created_at,
          recipients:mail_recipients(user_id, read_at)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSent(data || []);
    } catch (e) {
      console.error('[Mail] fetchSent:', e);
      setSent([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /* 폴더 변경 시 자동 fetch */
  useEffect(() => {
    if (!user) return;
    fetchUsers();
    if (folder === 'sent') fetchSent();
    else fetchInbox();
    // 선택 해제
    setSelectedId(null);
  }, [user, folder, fetchInbox, fetchSent, fetchUsers]);

  /* 보여줄 메일 목록 — 폴더 + 검색 적용 */
  const visibleMails = useMemo(() => {
    let list = [];
    if (folder === 'sent') {
      list = sent.map((m) => ({
        kind: 'sent',
        id: m.id,
        recipientId: null,
        message: m,
        recipients: m.recipients || [],
        starred: false,
        read_at: 'sent',
        created_at: m.created_at,
      }));
    } else {
      const rows = inbox;
      const matchFolder =
        folder === 'inbox'   ? (r) => r.folder === 'inbox' && !r.starred ? true : r.folder === 'inbox'
        : folder === 'starred' ? (r) => r.starred && r.folder !== 'trash'
        : folder === 'trash'  ? (r) => r.folder === 'trash'
        : () => true;
      list = rows.filter(matchFolder).map((r) => ({
        kind: 'inbox',
        id: r.id,                // mail_recipients.id
        recipientId: r.id,
        messageId: r.message?.id,
        message: r.message,
        starred: r.starred,
        read_at: r.read_at,
        folder: r.folder,
        created_at: r.created_at,
      }));
    }

    /* 검색 */
/* 카테고리 필터 */
if (categoryFilter) {
  list = list.filter((m) => (m.message?.category || 'general') === categoryFilter);
}
/* 목록 필터 탭 */
if (listFilter === 'unread') {
  list = list.filter((m) => m.kind === 'inbox' && !m.read_at);
} else if (listFilter === 'starred') {
  list = list.filter((m) => m.starred);
} else if (listFilter === 'attached') {
  /* 첨부 표시 — 일단 본문에 "첨부:" 또는 mail_attachments 가 있을 때.
     첨부 테이블이 없으면 본문 키워드로 폴백. */
  list = list.filter((m) => {
    const body = m.message?.body || '';
    return /첨부|attach/i.test(body);
  });
}

/* 검색 */
const kw = search.trim().toLowerCase();
if (kw) {
  list = list.filter((m) =>
    (m.message?.subject || '').toLowerCase().includes(kw) ||
    (m.message?.body || '').toLowerCase().includes(kw)
  );
}
return list;
  }, [folder, inbox, sent, search, categoryFilter, listFilter]);

  /* 폴더별 카운트 */
/* 폴더별 카운트 + 카테고리별 카운트 + 이번주 통계 */
const counts = useMemo(() => {
  const inboxItems = inbox.filter((r) => r.folder === 'inbox');

  /* 카테고리별 카운트 — inbox + sent 합산 (휴지통 제외) */
  const allActive = [
    ...inbox.filter((r) => r.folder !== 'trash').map((r) => r.message),
    ...sent,
  ].filter(Boolean);

  const byCategory = {
    general: 0,
    notice:  0,
    mention: 0,
    system:  0,
  };
  allActive.forEach((m) => {
    const c = m.category || 'general';
    if (byCategory[c] !== undefined) byCategory[c] += 1;
    else byCategory.general += 1;
  });

  /* 이번주 통계 — 이번 주 월요일 00:00 기준 */
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay() || 7; // 일=0 → 7
  weekStart.setDate(weekStart.getDate() - (day - 1));

  const isThisWeek = (iso) => iso && new Date(iso) >= weekStart;

  const weekReceived = inboxItems.filter((r) => isThisWeek(r.created_at)).length;
  const weekUnread = inboxItems.filter((r) => !r.read_at).length;
  /* 답장 대기 — 받은 메일 중 안 읽음 + 7일 이내 */
  const weekToReply = inboxItems.filter((r) => {
    if (!r.read_at) return false; // 안 읽은 건 위에 있음
    /* 7일 이내 받은 메일이고 답장 안 보낸 경우 — 간이 추정 */
    return isThisWeek(r.created_at);
  }).length;

  return {
    inbox:   inboxItems.length,
    unread:  weekUnread,
    starred: inbox.filter((r) => r.starred && r.folder !== 'trash').length,
    sent:    sent.length,
    trash:   inbox.filter((r) => r.folder === 'trash').length,
    /* 새로 추가 */
    byCategory,
    weekStats: {
      received: weekReceived,
      toReply:  weekToReply,
      unread:   weekUnread,
    },
  };
}, [inbox, sent]);

/* 필터 탭별 카운트 — 현재 폴더 + 카테고리 기준 */
const listCounts = useMemo(() => {
  /* 폴더 + 카테고리만 적용된 베이스 리스트 (필터 탭 적용 전) */
  let base = [];
  if (folder === 'sent') {
    base = sent.map((m) => ({ kind: 'sent', message: m, starred: false, read_at: 'sent' }));
  } else {
    const matchFolder =
      folder === 'inbox'  ? (r) => r.folder === 'inbox'
      : folder === 'starred' ? (r) => r.starred && r.folder !== 'trash'
      : folder === 'trash'  ? (r) => r.folder === 'trash'
      : () => true;
    base = inbox.filter(matchFolder).map((r) => ({
      kind: 'inbox',
      message: r.message,
      starred: r.starred,
      read_at: r.read_at,
    }));
  }
  if (categoryFilter) {
    base = base.filter((m) => (m.message?.category || 'general') === categoryFilter);
  }

  return {
    all:      base.length,
    unread:   base.filter((m) => m.kind === 'inbox' && !m.read_at).length,
    starred:  base.filter((m) => m.starred).length,
    attached: base.filter((m) => /첨부|attach/i.test(m.message?.body || '')).length,
  };
}, [folder, inbox, sent, categoryFilter]);

  /* 선택된 메일 */
  const selectedMail = useMemo(
    () => visibleMails.find((m) => m.id === selectedId) || null,
    [visibleMails, selectedId]
  );

  /* 메일 선택 + 읽음 처리 */
  const selectMail = useCallback(async (id) => {
    setSelectedId(id);
    const item = visibleMails.find((m) => m.id === id);
    if (item?.kind === 'inbox' && !item.read_at && item.recipientId) {
      /* 읽음 표시 */
      try {
        await supabase
          .from('mail_recipients')
          .update({ read_at: new Date().toISOString() })
          .eq('id', item.recipientId);
        /* 로컬 갱신 */
        setInbox((prev) =>
          prev.map((r) => (r.id === item.recipientId ? { ...r, read_at: new Date().toISOString() } : r))
        );
      } catch (e) {
        console.warn('[Mail] mark read failed', e);
      }
    }
  }, [visibleMails]);
  
/* 스레드 조회 — 같은 parent_id 또는 자신이 부모인 메일들 */
const fetchThread = useCallback(async (mail) => {
  if (!user || !mail?.message?.id) return [];
  const messageId = mail.message.id;
  const parentId = mail.message.parent_id;
  const rootId = parentId || messageId; // 스레드의 루트 메시지 ID

  try {
    /* root 메일 + 모든 답장들 (parent_id = rootId 인 것들 + rootId 자체) */
    const { data, error } = await supabase
      .from('mail_messages')
      .select('id, subject, body, sender_id, parent_id, category, created_at')
      .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
      .order('created_at', { ascending: true });
    if (error) throw error;
    /* 현재 보고 있는 메일은 제외 */
    return (data || []).filter((m) => m.id !== messageId);
  } catch (e) {
    console.warn('[Mail] fetchThread:', e);
    return [];
  }
}, [user]);

/* 인라인 답장 — 모달 없이 바로 전송 */
const quickReply = useCallback(async (originalMail, replyBody) => {
  if (!originalMail?.message) return { ok: false, error: '원본 메일 없음' };
  if (!replyBody?.trim()) return { ok: false, error: '내용을 입력해주세요' };

  const original = originalMail.message;
  return await sendMail({
    subject: original.subject?.startsWith('Re: ') ? original.subject : `Re: ${original.subject || ''}`,
    body: replyBody,
    recipientIds: [original.sender_id],
    parentId: original.id,
    category: original.category || 'general',
  });
}, []); // sendMail은 hoisting 되니까 deps 비워둠 (또는 [sendMail] — 둘 다 동작)

  /* 별표 토글 */
  const toggleStar = useCallback(async (recipientId) => {
    const target = inbox.find((r) => r.id === recipientId);
    if (!target) return;
    const next = !target.starred;
    setInbox((prev) =>
      prev.map((r) => (r.id === recipientId ? { ...r, starred: next } : r))
    );
    try {
      await supabase
        .from('mail_recipients')
        .update({ starred: next })
        .eq('id', recipientId);
    } catch (e) {
      console.warn('[Mail] toggleStar failed', e);
      /* rollback */
      setInbox((prev) =>
        prev.map((r) => (r.id === recipientId ? { ...r, starred: !next } : r))
      );
    }
  }, [inbox]);

  /* ─── 일괄 선택 ─────────────────────────────── */
const toggleSelect = useCallback((id) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}, []);

const selectAll = useCallback(() => {
  setSelectedIds(new Set(visibleMails.map((m) => m.id)));
}, [visibleMails]);

const clearSelection = useCallback(() => {
  setSelectedIds(new Set());
}, []);

/* 일괄 읽음 처리 */
const markSelectedAsRead = useCallback(async () => {
  const ids = [...selectedIds];
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  const targets = inbox.filter((r) => ids.includes(r.id) && !r.read_at);
  if (targets.length === 0) {
    clearSelection();
    return;
  }
  setInbox((prev) =>
    prev.map((r) => (ids.includes(r.id) ? { ...r, read_at: r.read_at || now } : r))
  );
  try {
    await supabase
      .from('mail_recipients')
      .update({ read_at: now })
      .in('id', targets.map((r) => r.id));
  } catch (e) {
    console.warn('[Mail] bulk read failed', e);
  }
  clearSelection();
}, [selectedIds, inbox, clearSelection]);

/* 일괄 별표 */
const starSelected = useCallback(async () => {
  const ids = [...selectedIds];
  if (ids.length === 0) return;
  setInbox((prev) =>
    prev.map((r) => (ids.includes(r.id) ? { ...r, starred: true } : r))
  );
  try {
    await supabase
      .from('mail_recipients')
      .update({ starred: true })
      .in('id', ids);
  } catch (e) {
    console.warn('[Mail] bulk star failed', e);
  }
  clearSelection();
}, [selectedIds, clearSelection]);

/* 일괄 휴지통 */
const trashSelected = useCallback(async () => {
  const ids = [...selectedIds];
  if (ids.length === 0) return;
  if (!window.confirm(`${ids.length}개의 메일을 휴지통으로 옮길까요?`)) return;
  setInbox((prev) =>
    prev.map((r) => (ids.includes(r.id) ? { ...r, folder: 'trash' } : r))
  );
  try {
    await supabase
      .from('mail_recipients')
      .update({ folder: 'trash' })
      .in('id', ids);
  } catch (e) {
    console.warn('[Mail] bulk trash failed', e);
  }
  clearSelection();
}, [selectedIds, clearSelection]);

  /* 휴지통으로 이동 */
  const moveToTrash = useCallback(async (recipientId) => {
    try {
      await supabase
        .from('mail_recipients')
        .update({ folder: 'trash' })
        .eq('id', recipientId);
      setInbox((prev) =>
        prev.map((r) => (r.id === recipientId ? { ...r, folder: 'trash' } : r))
      );
      setSelectedId(null);
      return { ok: true };
    } catch (e) {
      console.error('[Mail] moveToTrash:', e);
      return { ok: false, error: e.message };
    }
  }, []);

  /* 휴지통에서 복원 */
  const restoreFromTrash = useCallback(async (recipientId) => {
    try {
      await supabase
        .from('mail_recipients')
        .update({ folder: 'inbox' })
        .eq('id', recipientId);
      setInbox((prev) =>
        prev.map((r) => (r.id === recipientId ? { ...r, folder: 'inbox' } : r))
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /* 영구 삭제 (휴지통에서) */
  const permanentDelete = useCallback(async (recipientId) => {
    try {
      await supabase.from('mail_recipients').delete().eq('id', recipientId);
      setInbox((prev) => prev.filter((r) => r.id !== recipientId));
      setSelectedId(null);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /* 메일 전송 */
  const sendMail = useCallback(async ({ subject, body, recipientIds, parentId, category }) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    if (!recipientIds || recipientIds.length === 0) {
      return { ok: false, error: '수신자를 1명 이상 선택해주세요.' };
    }

    try {
      const { data: msg, error: msgErr } = await supabase
        .from('mail_messages')
        .insert([{
          subject: (subject || '').trim() || '(제목 없음)',
          body: body || '',
          sender_id: user.id,
          parent_id: parentId || null,
          category: category || 'general',
        }])
        .select()
        .single();
      if (msgErr) throw msgErr;

      const rows = recipientIds.map((uid) => ({
        message_id: msg.id,
        user_id: uid,
      }));
      const { error: recErr } = await supabase.from('mail_recipients').insert(rows);
      if (recErr) throw recErr;
     
      const senderName = user.user_metadata?.name || user.email?.split('@')[0] || '동료';
      createBulkNotifications(recipientIds, {
        type: 'mail',
        title: '새 메일이 도착했어요',
        body: `${senderName}: ${msg.subject}`,
        link: '/mail',
        refId: msg.id,
      });

      /* 보낸편지함이라면 로컬 갱신 */
      if (folder === 'sent') fetchSent();

      return { ok: true, message: msg };
    } catch (e) {
      console.error('[Mail] sendMail:', e);
      return { ok: false, error: e.message || '전송 실패' };
    }
  }, [user, folder, fetchSent]);

  /* 작성 모달 열기/닫기 */
  const openCompose = useCallback((mode = 'new', initial = null) => {
    setComposeModal({ open: true, mode, initial });
  }, []);
  const closeCompose = useCallback(() => {
    setComposeModal({ open: false, mode: 'new', initial: null });
  }, []);

return (
  <MailContext.Provider value={{
    /* 상태 */
    folder, setFolder,
    search, setSearch,
    selectedId, setSelectedId,
    selectMail,
    categoryFilter, setCategoryFilter,
    listFilter, setListFilter,
    selectedIds,
    /* 데이터 */
    inbox, sent, allUsers,
    visibleMails, selectedMail, counts, listCounts,
    loading,
    /* 액션 */
    fetchThread, quickReply,
    toggleStar,
    toggleSelect, selectAll, clearSelection,
    markSelectedAsRead, starSelected, trashSelected,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    sendMail,
    fetchInbox, fetchSent,
    /* 작성 모달 */
    composeModal,
    openCompose,
    closeCompose,
  }}>
      {children}
    </MailContext.Provider>
  );
}

export function useMail() {
  const ctx = useContext(MailContext);
  if (!ctx) throw new Error('useMail must be used within MailProvider');
  return ctx;
}