// components/admin/AdminUsersTab.jsx
// 사용자 관리 탭 — 원본 tab-users + loadAdminUsers 이관.
// 이름/부서 수정은 AdminUserEditModal 에서 처리.
// "신규 계정 발급"은 원본에서도 미구현(showToast)이라 동일하게 안내만.

import { useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { useToast } from '../../contexts/ToastContext';

const thStyle = { color: 'var(--text-muted)', padding: '15px 0' };

export default function AdminUsersTab() {
  const toast = useToast();
  const { users, usersLoading, usersError, loadUsers, openUserEdit } =
    useAdmin();

  /* 탭 진입 시 로드 */
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 15,
          alignItems: 'center',
          width: '100%',
        }}
      >
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>
          사내 계정 관리
        </h3>
        <button
          type="button"
          className="btn btn-in"
          style={{
            flex: 'none',
            width: 'auto',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            borderRadius: 8,
          }}
          onClick={() => toast.info('이 기능은 준비중입니다.')}
        >
          <i className="fa-solid fa-user-plus" /> 신규 계정 발급
        </button>
      </div>

      <div
        className="panel"
        style={{
          boxShadow: 'none',
          border: '1px solid var(--border-color)',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--hover-bg)' }}>
            <tr
              style={{
                textAlign: 'left',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <th style={{ ...thStyle, padding: '15px 20px' }}>이름</th>
              <th style={thStyle}>부서/직급</th>
              <th style={thStyle}>권한</th>
              <th style={thStyle}>계정 상태</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {usersLoading && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: 20,
                    color: 'var(--text-muted)',
                  }}
                >
                  로딩 중...
                </td>
              </tr>
            )}

            {!usersLoading && usersError && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: 20,
                    color: 'var(--danger)',
                  }}
                >
                  데이터를 불러오지 못했습니다: {usersError}
                </td>
              </tr>
            )}

            {!usersLoading && !usersError && users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: 20,
                    color: 'var(--text-muted)',
                  }}
                >
                  사용자 데이터가 없습니다.
                </td>
              </tr>
            )}

            {!usersLoading &&
              !usersError &&
              users.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <td
                    style={{
                      padding: '12px 20px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div
                      className="avatar"
                      style={{
                        width: 30,
                        height: 30,
                        backgroundImage: `url('${
                          u.avatar_url ||
                          'https://i.pravatar.cc/150?u=' + u.id
                        }')`,
                      }}
                    />
                    {u.full_name || '이름 없음'}
                  </td>
                  <td>{u.department || '-'}</td>
                  <td>
                    {u.is_admin ? (
                      <span
                        className="notice-tag"
                        style={{
                          background: 'rgba(67,97,238,0.1)',
                          color: 'var(--primary-color)',
                        }}
                      >
                        최고 관리자
                      </span>
                    ) : (
                      '일반 사용자'
                    )}
                  </td>
                  <td>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                      <i
                        className="fa-solid fa-circle"
                        style={{ fontSize: 8 }}
                      />{' '}
                      활성
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() =>
                        openUserEdit({
                          id: u.id,
                          full_name: u.full_name || '',
                          department: u.department || '',
                        })
                      }
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}