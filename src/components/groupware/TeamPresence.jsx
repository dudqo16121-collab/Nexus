// components/groupware/TeamPresence.jsx
// 부서원 실시간 상태 — 실제 직원 + 출근 데이터 연동.
//
// 상태 판단:
//  - online    : 오늘 check_in 있고 check_out 없음
//  - off-work  : 오늘 check_out 있음
//  - offline   : 오늘 출근 기록 없음
//  - meeting/focus/away : profiles.custom_status (사용자 직접 설정)
//
// 본인 부서원만 표시. 부서가 없으면 전체 직원.
// "메시지" 버튼 클릭 시 메신저로 DM 열기.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useMessenger } from '../../contexts/MessengerContext';
import { useToast } from '../../contexts/ToastContext';

const REFRESH_INTERVAL_MS = 60_000; // 1분마다 갱신

const STATUS_META = {
  online:   { label: '🟢 온라인',     color: '#22c55e',        cls: 'online',   sortOrder: 0 },
  meeting:  { label: '🔴 회의 중',    color: 'var(--danger)',  cls: 'meeting',  sortOrder: 1 },
  focus:    { label: '🟡 집중 모드', color: 'var(--warning)', cls: 'focus',    sortOrder: 2 },
  away:     { label: '🟠 자리 비움', color: '#f59e0b',        cls: 'meeting',  sortOrder: 3 },
  'off-work': { label: '🔵 퇴근',    color: 'var(--text-muted)', cls: 'offline', sortOrder: 4 },
  offline:  { label: '⚫ 오프라인',  color: 'var(--text-muted)', cls: 'offline', sortOrder: 5 },
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function avatarOf(u) {
  return u.avatar_url || `https://i.pravatar.cc/150?u=${u.id}`;
}

export default function TeamPresence() {
  const toast = useToast();
  const { user, profile } = useAuth();
  const { openDM } = useMessenger();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  /* 데이터 로드 */
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const myDept = profile?.department;

      /* 1) 같은 부서원 (없으면 전체에서 최대 8명) */
      let profileQuery = supabase
        .from('profiles')
        .select('id, full_name, department, position, avatar_url, custom_status, custom_status_until, is_active')
        .neq('id', user.id);

      if (myDept) {
        profileQuery = profileQuery.eq('department', myDept);
      } else {
        profileQuery = profileQuery.limit(8);
      }

      const { data: profiles, error: pErr } = await profileQuery.order('full_name');
      if (pErr) throw pErr;

      const profileList = (profiles || []).filter((p) => p.is_active !== false);
      if (profileList.length === 0) {
        setMembers([]);
        return;
      }

      /* 2) 오늘 출근 기록 */
      const ids = profileList.map((p) => p.id);
      const { data: attendance, error: aErr } = await supabase
        .from('attendance')
        .select('user_id, check_in, check_out')
        .eq('created_at', todayStr())
        .in('user_id', ids);
      if (aErr) throw aErr;

      const attMap = new Map();
      (attendance || []).forEach((r) => attMap.set(r.user_id, r));

      /* 3) 상태 계산 */
      const now = Date.now();
      const merged = profileList.map((p) => {
        let status = 'offline';
        const rec = attMap.get(p.id);

        /* 사용자 직접 설정 status 우선 (만료 시간 미경과 시) */
        if (p.custom_status) {
          const stillValid = !p.custom_status_until || new Date(p.custom_status_until).getTime() > now;
          if (stillValid && STATUS_META[p.custom_status]) {
            status = p.custom_status;
          }
        }

        /* custom_status 없으면 출근 기록 기반 */
        if (status === 'offline' && rec) {
          if (rec.check_out) {
            status = 'off-work';
          } else if (rec.check_in) {
            status = 'online';
          }
        }

        return {
          id: p.id,
          name: p.full_name || '이름 없음',
          position: p.position || '',
          department: p.department || '',
          avatar: avatarOf(p),
          status,
          ...STATUS_META[status],
        };
      });

      /* 정렬 — 온라인/활성 먼저 */
      merged.sort((a, b) => {
        const so = (STATUS_META[a.status]?.sortOrder ?? 99) - (STATUS_META[b.status]?.sortOrder ?? 99);
        if (so !== 0) return so;
        return a.name.localeCompare(b.name);
      });

      setMembers(merged);
    } catch (e) {
      console.error('[TeamPresence] load:', e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  /* 마운트 + 주기적 갱신 */
  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadData]);

  /* Realtime 구독 — 다른 사람의 출퇴근 변경 시 즉시 반영 */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('team_presence_attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `created_at=eq.${todayStr()}`,
        },
        () => loadData()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadData]);

  /* 온라인 카운트 — offline/off-work 제외 */
  const onlineCount = useMemo(
    () => members.filter((m) => m.status !== 'offline' && m.status !== 'off-work').length,
    [members]
  );

  /* DM 열기 */
  const handleMessage = (member) => {
    if (typeof openDM === 'function') {
      openDM(member.id);
    } else {
      /* openDM 없으면 토스트로 안내 */
      toast.info(`${member.name}님에게 메시지`);
    }
  };

  return (
    <div className="bento-card card-team-presence">
      <div className="bento-header">
        <h3>
          <i className="fa-solid fa-satellite-dish" style={{ color: 'var(--success)' }} />
          부서원 실시간 상태
          {profile?.department && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>
              {profile.department}
            </span>
          )}
        </h3>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {loading && members.length === 0 ? (
            <><i className="fa-solid fa-spinner fa-spin" /> 로딩</>
          ) : (
            <>{onlineCount}명 온라인</>
          )}
        </span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {!loading && members.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 16px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            <i
              className="fa-regular fa-user"
              style={{ fontSize: '1.8rem', display: 'block', marginBottom: 10, opacity: 0.4 }}
            />
            <p style={{ margin: 0 }}>
              {profile?.department
                ? '같은 부서원이 없어요.'
                : '부서 정보가 없어요.'}
            </p>
          </div>
        ) : (
          members.map((member) => {
            const isOffline = member.status === 'offline' || member.status === 'off-work';
            return (
              <div key={member.id} className="presence-item">
                <div className="presence-user">
                  <div className="avatar-wrap">
                    <div
                      className="avatar"
                      style={{ backgroundImage: `url('${member.avatar}')` }}
                    />
                    <div className={`status-dot dot-${member.cls}`} />
                  </div>
                  <div className="presence-info">
                    <h5>
                      {member.name}
                      {member.position && (
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                          {member.position}
                        </span>
                      )}
                    </h5>
                    <p style={{ color: member.color }}>{member.label}</p>
                  </div>
                </div>
                <button
                  disabled={isOffline}
                  onClick={() => handleMessage(member)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    padding: '5px 10px',
                    cursor: isOffline ? 'not-allowed' : 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                    opacity: isOffline ? 0.5 : 1,
                  }}
                >
                  <i className="fa-solid fa-comment" /> 메시지
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}