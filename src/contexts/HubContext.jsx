// contexts/HubContext.jsx
// INJOY Hub 데이터 로직 — 칭찬 / 미션 / 포인트 / 랭킹 / 상점 / 인벤토리.

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const HubContext = createContext(null);

export const KUDOS_TAGS = [
  { id: 'thanks',     label: '고마워요',  icon: 'fa-heart',     color: '#f72585' },
  { id: 'great-work', label: '잘했어요',  icon: 'fa-star',      color: '#ff9f1c' },
  { id: 'teamwork',   label: '팀워크',    icon: 'fa-people-group', color: '#4361ee' },
  { id: 'innovation', label: '아이디어',  icon: 'fa-lightbulb', color: '#06d6a0' },
];

export const PRODUCT_CATEGORIES = [
  { value: 'all',     label: '전체',     icon: 'fa-store',          color: '#6b7280' },
  { value: 'leave',   label: '연차/휴식', icon: 'fa-umbrella-beach', color: '#06d6a0' },
  { value: 'meal',    label: '식사',      icon: 'fa-utensils',       color: '#f59e0b' },
  { value: 'voucher', label: '상품권',    icon: 'fa-ticket',         color: '#ec4899' },
  { value: 'goods',   label: '굿즈',      icon: 'fa-gift',           color: '#8338ec' },
  { value: 'etc',     label: '기타',      icon: 'fa-box',            color: '#6b7280' },
];

const LEVEL_THRESHOLD = 100;

export function HubProvider({ children }) {
  const { user } = useAuth();
  const { createNotification } = useNotification();

  const [kudos, setKudos] = useState([]);
  const [missions, setMissions] = useState([]);
  const [progresses, setProgresses] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(false);

  /* 모달 */
  const [sendKudosModal, setSendKudosModal] = useState({ open: false, presetTarget: null });
  const [missionEditorModal, setMissionEditorModal] = useState({ open: false, mission: null });

  /* ── 데이터 fetch ── */

  const fetchKudos = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_kudos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) setKudos([]);
    else setKudos(data || []);
  }, []);

  const fetchMissions = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_missions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setMissions([]);
    else setMissions(data || []);
  }, []);

  const fetchProgresses = useCallback(async () => {
    const { data, error } = await supabase.from('hub_mission_progress').select('*');
    if (error) setProgresses([]);
    else setProgresses(data || []);
  }, []);

  const fetchProducts = useCallback(async () => {
    setMarketLoading(true);
    const { data, error } = await supabase
      .from('hub_products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setProducts([]);
    else setProducts(data || []);
    setMarketLoading(false);
  }, []);

  const fetchPurchases = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_purchases')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setPurchases([]);
    else setPurchases(data || []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchKudos(),
      fetchMissions(),
      fetchProgresses(),
      fetchProducts(),
      fetchPurchases(),
    ]);
    setLoading(false);
  }, [fetchKudos, fetchMissions, fetchProgresses, fetchProducts, fetchPurchases]);

  useEffect(() => { refresh(); }, [refresh]);

  /* === 사용자별 누적 포인트 (구매로 차감된 만큼 빼기) === */
  const userPoints = useMemo(() => {
    const fromKudos = {};
    for (const k of kudos) {
      fromKudos[k.to_id] = (fromKudos[k.to_id] || 0) + (k.points || 0);
    }
    const fromMissions = {};
    for (const p of progresses) {
      if (p.status === 'completed') {
        const m = missions.find((x) => x.id === p.mission_id);
        if (m) fromMissions[p.user_id] = (fromMissions[p.user_id] || 0) + (m.points || 0);
      }
    }
    /* 구매로 차감된 포인트 */
    const spent = {};
    for (const pu of purchases) {
      spent[pu.user_id] = (spent[pu.user_id] || 0) + (pu.price_paid || 0);
    }

    const all = new Set([
      ...Object.keys(fromKudos),
      ...Object.keys(fromMissions),
      ...Object.keys(spent),
    ]);
    const result = {};
    for (const uid of all) {
      const earned = (fromKudos[uid] || 0) + (fromMissions[uid] || 0);
      const used = spent[uid] || 0;
      const total = earned - used;
      result[uid] = {
        total,
        earned,
        spent: used,
        kudos: fromKudos[uid] || 0,
        missions: fromMissions[uid] || 0,
        level: Math.floor(earned / LEVEL_THRESHOLD) + 1,   /* 레벨은 누적 획득 기준 */
        progressInLevel: earned % LEVEL_THRESHOLD,
        nextLevelAt: LEVEL_THRESHOLD,
      };
    }
    return result;
  }, [kudos, missions, progresses, purchases]);

  const myStats = useMemo(() => {
    if (!user) return { total: 0, earned: 0, spent: 0, kudos: 0, missions: 0, level: 1, progressInLevel: 0, nextLevelAt: LEVEL_THRESHOLD };
    const me = userPoints[user.id];
    if (me) return me;
    return { total: 0, earned: 0, spent: 0, kudos: 0, missions: 0, level: 1, progressInLevel: 0, nextLevelAt: LEVEL_THRESHOLD };
  }, [userPoints, user]);

  /* 내 보유 포인트 — HubMarket 에서 사용 */
  const myPoints = myStats.total;

  /* === 이달의 랭킹 === */
  const monthlyRanking = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const counts = {};
    for (const k of kudos) {
      const t = new Date(k.created_at).getTime();
      if (t >= monthStart) {
        counts[k.to_id] = (counts[k.to_id] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [kudos]);

  /* === 칭찬 === */
  const myReceivedKudos = useMemo(
    () => kudos.filter((k) => k.to_id === user?.id).slice(0, 20),
    [kudos, user]
  );
  const mySentKudos = useMemo(
    () => kudos.filter((k) => k.from_id === user?.id).slice(0, 20),
    [kudos, user]
  );

  /* === 활성 미션 === */
  const activeMissions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return missions.filter((m) => {
      if (m.status !== 'active') return false;
      if (m.end_date && m.end_date < today) return false;
      return true;
    });
  }, [missions]);

  const getMyProgress = useCallback(
    (missionId) => progresses.find((p) => p.mission_id === missionId && p.user_id === user?.id) || null,
    [progresses, user]
  );

  /* === 내 인벤토리 === */
  const myPurchases = useMemo(
    () => purchases.filter((p) => p.user_id === user?.id),
    [purchases, user]
  );

  /* === 액션 — 칭찬 === */
  const sendKudos = useCallback(async ({ toId, message, tag }) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    if (toId === user.id) return { ok: false, error: '본인에게는 보낼 수 없어요.' };
    try {
      const { data, error } = await supabase
        .from('hub_kudos')
        .insert([{ from_id: user.id, to_id: toId, message, tag, points: 10 }])
        .select()
        .single();
      if (error) throw error;
      setKudos((prev) => [data, ...prev]);

      const senderName = user.user_metadata?.name || user.email?.split('@')[0] || '동료';
      const tagLabel = KUDOS_TAGS.find((t) => t.id === tag)?.label || '칭찬';
      createNotification({
        toUserId: toId,
        type: 'kudos',
        title: `${tagLabel} 칭찬을 받았어요 💛`,
        body: `${senderName}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        link: '/injoyhub',
        refId: data.id,
      });

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || '전송 실패' };
    }
  }, [user, createNotification]);

  /* === 액션 — 미션 === */
  const joinMission = useCallback(async (missionId) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    try {
      const { data, error } = await supabase
        .from('hub_mission_progress')
        .insert([{ mission_id: missionId, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      setProgresses((prev) => [...prev, data]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.code === '23505' ? '이미 참여 중인 미션이에요.' : (e.message || '실패') };
    }
  }, [user]);

  const completeMission = useCallback(async (progressId) => {
    try {
      const { data, error } = await supabase
        .from('hub_mission_progress')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', progressId)
        .select()
        .single();
      if (error) throw error;
      setProgresses((prev) => prev.map((p) => (p.id === progressId ? data : p)));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || '실패' };
    }
  }, []);

  const leaveMission = useCallback(async (progressId) => {
    try {
      const { error } = await supabase.from('hub_mission_progress').delete().eq('id', progressId);
      if (error) throw error;
      setProgresses((prev) => prev.filter((p) => p.id !== progressId));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /* 관리자 미션 CRUD */
  const createMission = useCallback(async (payload) => {
    if (!user) return { ok: false };
    try {
      const { data, error } = await supabase
        .from('hub_missions')
        .insert([{ ...payload, created_by: user.id }])
        .select()
        .single();
      if (error) throw error;
      setMissions((prev) => [data, ...prev]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user]);

  const updateMission = useCallback(async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('hub_missions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setMissions((prev) => prev.map((m) => (m.id === id ? data : m)));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const deleteMission = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('hub_missions').delete().eq('id', id);
      if (error) throw error;
      setMissions((prev) => prev.filter((m) => m.id !== id));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /* === 액션 — 상점 / 인벤토리 === */
  const purchaseProduct = useCallback(async (productId) => {
    try {
      const { data, error } = await supabase.rpc('purchase_hub_product', {
        p_product_id: productId,
      });
      if (error) throw error;
      /* 상품 목록 + 구매 내역 갱신 */
      await Promise.all([fetchProducts(), fetchPurchases()]);
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [fetchProducts, fetchPurchases]);

  const useMyPurchase = useCallback(async (purchaseId, note) => {
    try {
      const { data, error } = await supabase.rpc('use_hub_purchase', {
        p_purchase_id: purchaseId,
        p_note: note || null,
      });
      if (error) throw error;
      await fetchPurchases();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [fetchPurchases]);

  /* 관리자 — 상품 CRUD */
  const createProduct = useCallback(async (product) => {
    if (!user) return { ok: false };
    try {
      const { data, error } = await supabase
        .from('hub_products')
        .insert([{ ...product, created_by: user.id }])
        .select()
        .single();
      if (error) throw error;
      setProducts((prev) => [data, ...prev]);
      return { ok: true, product: data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user]);

  const updateProduct = useCallback(async (id, patch) => {
    try {
      const { error } = await supabase
        .from('hub_products')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const deleteProduct = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('hub_products').delete().eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /* 모달 */
  const openSendKudos = useCallback((presetTarget = null) => {
    setSendKudosModal({ open: true, presetTarget });
  }, []);
  const closeSendKudos = useCallback(() => {
    setSendKudosModal({ open: false, presetTarget: null });
  }, []);

  const openMissionEditor = useCallback((mission = null) => {
    setMissionEditorModal({ open: true, mission });
  }, []);
  const closeMissionEditor = useCallback(() => {
    setMissionEditorModal({ open: false, mission: null });
  }, []);

  return (
    <HubContext.Provider value={{
      loading,
      marketLoading,
      kudos, missions, progresses,
      products, purchases, myPurchases,
      myStats, myPoints, userPoints, monthlyRanking,
      myReceivedKudos, mySentKudos,
      activeMissions,
      getMyProgress,
      sendKudos, joinMission, completeMission, leaveMission,
      createMission, updateMission, deleteMission,
      purchaseProduct, useMyPurchase,
      createProduct, updateProduct, deleteProduct,
      fetchProducts, fetchPurchases,
      sendKudosModal, openSendKudos, closeSendKudos,
      missionEditorModal, openMissionEditor, closeMissionEditor,
      refresh,
    }}>
      {children}
    </HubContext.Provider>
  );
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error('useHub must be used within HubProvider');
  return ctx;
}