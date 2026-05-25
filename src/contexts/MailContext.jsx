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
  const [folder, setFolder] = useState('inbox'); // inbox | sent | starred | trash
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  /* 데이터 */
  const [inbox, setInbox] = useState([]);     // {message, recipient}
  const [sent, setSent] = useState([]);       // {message}
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]); // 수신자 선택용

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
    const kw = search.trim().toLowerCase();
    if (kw) {
      list = list.filter((m) =>
        (m.message?.subject || '').toLowerCase().includes(kw) ||
        (m.message?.body || '').toLowerCase().includes(kw)
      );
    }
    return list;
  }, [folder, inbox, sent, search]);

  /* 폴더별 카운트 */
  const counts = useMemo(() => {
    const inboxItems = inbox.filter((r) => r.folder === 'inbox');
    return {
      inbox:   inboxItems.length,
      unread:  inboxItems.filter((r) => !r.read_at).length,
      starred: inbox.filter((r) => r.starred && r.folder !== 'trash').length,
      sent:    sent.length,
      trash:   inbox.filter((r) => r.folder === 'trash').length,
    };
  }, [inbox, sent]);

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
      /* 데이터 */
      inbox, sent, allUsers,
      visibleMails, selectedMail, counts,
      loading,
      /* 액션 */
      toggleStar,
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