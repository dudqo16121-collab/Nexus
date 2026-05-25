// pages/EmployeeManagement.jsx
// 관리자 전용 직원관리 페이지.
// 라우트: /admin/orgchart

import { useEffect, useState, useMemo } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSystemLog } from '../contexts/SystemLogContext';
import { SkeletonTable } from '../components/common/Skeleton';
import EmployeeEditModal from '../components/admin/EmployeeEditModal';

export default function EmployeeManagement() {
  const { profile } = useAuth();
  const toast = useToast();
  const { logEvent } = useSystemLog();
  const {
    users,
    usersLoading,
    usersError,
    loadUsers,
    updateUser,
    toggleAdmin,
    toggleActive,
    bulkUpdateDepartment,
  } = useAdmin();

  const isAdmin = profile?.is_admin === true;

  /* 필터/검색/정렬 */
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all'); // all | admin | user
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
  const [sortBy, setSortBy] = useState('name'); // name | dept | joined

  /* 선택/모달 */
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editTarget, setEditTarget] = useState(null);
  const [bulkDeptDialog, setBulkDeptDialog] = useState(false);
  const [bulkDeptValue, setBulkDeptValue] = useState('');

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  /* 부서 목록 */
  const departments = useMemo(() => {
    const set = new Set();
    users.forEach((u) => { if (u.department) set.add(u.department); });
    return Array.from(set).sort();
  }, [users]);

  /* 필터링/정렬 */
  const filtered = useMemo(() => {
    let list = [...users];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((u) =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    if (deptFilter !== 'all') {
      list = list.filter((u) => u.department === deptFilter);
    }
    if (roleFilter === 'admin') {
      list = list.filter((u) => u.is_admin === true);
    } else if (roleFilter === 'user') {
      list = list.filter((u) => u.is_admin !== true);
    }
    if (statusFilter === 'active') {
      list = list.filter((u) => u.is_active !== false);
    } else if (statusFilter === 'inactive') {
      list = list.filter((u) => u.is_active === false);
    }

    /* 정렬 */
    list.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.full_name || '').localeCompare(b.full_name || '');
      }
      if (sortBy === 'dept') {
        return (a.department || '').localeCompare(b.department || '');
      }
      if (sortBy === 'joined') {
        return (b.hire_date || '').localeCompare(a.hire_date || '');
      }
      return 0;
    });

    return list;
  }, [users, search, deptFilter, roleFilter, statusFilter, sortBy]);

  /* 통계 */
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.is_active !== false).length,
    admins: users.filter((u) => u.is_admin).length,
    departments: departments.length,
  }), [users, departments]);

  /* 권한 토글 */
  const handleToggleAdmin = async (u) => {
    const next = !u.is_admin;
    const verb = next ? '부여' : '회수';
    if (!confirm(`${u.full_name}님에게 관리자 권한을 ${verb}할까요?`)) return;

    const res = await toggleAdmin(u.id, next);
    if (res.ok) {
      toast.success(`관리자 권한이 ${verb}되었습니다.`);
      logEvent('warn', 'admin', `관리자 권한 ${verb}: ${u.full_name}`, {
        refType: 'profile',
        refId: u.id,
        meta: { previous: u.is_admin, current: next },
      });
    } else {
      toast.error(res.error || '실패');
    }
  };

  /* 활성/비활성 토글 */
  const handleToggleActive = async (u) => {
    const currentActive = u.is_active !== false;
    const next = !currentActive;
    if (!confirm(`${u.full_name}님 계정을 ${next ? '활성화' : '비활성화'}할까요?`)) return;

    const res = await toggleActive(u.id, next);
    if (res.ok) {
      toast.success(`계정이 ${next ? '활성화' : '비활성화'}되었습니다.`);
      logEvent('info', 'admin', `계정 상태 변경: ${u.full_name}`, {
        refType: 'profile',
        refId: u.id,
        meta: { active: next },
      });
    } else {
      toast.error(res.error || '실패');
    }
  };

  /* 선택 토글 */
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((u) => u.id)));
    }
  };

  /* 일괄 부서 변경 */
  const handleBulkDept = async () => {
    if (!bulkDeptValue.trim()) {
      toast.error('부서를 입력하세요.');
      return;
    }
    const ids = Array.from(selectedIds);
    const res = await bulkUpdateDepartment(ids, bulkDeptValue.trim());
    if (res.ok) {
      toast.success(`${res.count}명의 부서가 변경되었습니다.`);
      logEvent('info', 'admin', `부서 일괄 변경: ${res.count}명`, {
        meta: { department: bulkDeptValue.trim(), userIds: ids },
      });
      setSelectedIds(new Set());
      setBulkDeptValue('');
      setBulkDeptDialog(false);
    } else {
      toast.error(res.error || '실패');
    }
  };

  /* CSV 내보내기 */
  const exportCSV = () => {
    const headers = ['이름', '이메일', '부서', '직급', '연락처', '권한', '상태', '입사일'];
    const rows = filtered.map((u) => [
      u.full_name || '',
      u.email || '',
      u.department || '',
      u.position || '',
      u.phone || '',
      u.is_admin ? '관리자' : '일반',
      u.is_active === false ? '비활성' : '활성',
      u.hire_date || '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.info('CSV 파일이 다운로드되었습니다.');
  };

  if (!isAdmin) {
    return (
      <section style={{ padding: 40, textAlign: 'center' }}>
        <i
          className="fa-solid fa-lock"
          style={{ fontSize: '3rem', color: 'var(--text-muted)', opacity: 0.5 }}
        />
        <h3 style={{ marginTop: 20 }}>관리자 권한이 필요한 페이지입니다.</h3>
      </section>
    );
  }

  return (
    <section id="view-employee-mgmt" style={{ padding: '24px 28px' }}>
      {/* 헤더 */}
      <header style={{ marginBottom: 22 }}>
        <h2
          style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: 0,
          }}
        >
          <i className="fa-solid fa-users-gear" style={{ color: '#8338ec' }} />
          직원 관리
        </h2>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.92rem',
            margin: '6px 0 0',
          }}
        >
          사내 직원 정보, 권한, 부서를 관리합니다.
        </p>
      </header>

      {/* 통계 카드 */}
      <div className="emp-stats">
        <div className="emp-stat">
          <div className="emp-stat-icon" style={{ background: 'rgba(67,97,238,0.12)', color: '#4361ee' }}>
            <i className="fa-solid fa-users" />
          </div>
          <div>
            <div className="emp-stat-value">{stats.total}</div>
            <div className="emp-stat-label">전체 직원</div>
          </div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-icon" style={{ background: 'rgba(6,214,160,0.12)', color: '#06d6a0' }}>
            <i className="fa-solid fa-circle-check" />
          </div>
          <div>
            <div className="emp-stat-value">{stats.active}</div>
            <div className="emp-stat-label">활성 계정</div>
          </div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-icon" style={{ background: 'rgba(131,56,236,0.12)', color: '#8338ec' }}>
            <i className="fa-solid fa-user-shield" />
          </div>
          <div>
            <div className="emp-stat-value">{stats.admins}</div>
            <div className="emp-stat-label">관리자</div>
          </div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-icon" style={{ background: 'rgba(255,159,28,0.12)', color: '#ff9f1c' }}>
            <i className="fa-solid fa-building" />
          </div>
          <div>
            <div className="emp-stat-value">{stats.departments}</div>
            <div className="emp-stat-label">부서</div>
          </div>
        </div>
      </div>

      {/* 필터/검색 바 */}
      <div className="emp-toolbar">
        <div className="emp-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="이름, 부서, 직급, 이메일 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="all">전체 부서</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">모든 권한</option>
          <option value="admin">관리자만</option>
          <option value="user">일반 사용자만</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">모든 상태</option>
          <option value="active">활성만</option>
          <option value="inactive">비활성만</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">이름순</option>
          <option value="dept">부서순</option>
          <option value="joined">최근 입사순</option>
        </select>

        <button className="emp-icon-btn" onClick={loadUsers} title="새로고침">
          <i className={`fa-solid fa-arrows-rotate ${usersLoading ? 'fa-spin' : ''}`} />
        </button>
        <button className="emp-icon-btn" onClick={exportCSV} title="CSV 내보내기">
          <i className="fa-solid fa-file-csv" />
        </button>
      </div>

      {/* 일괄 작업 바 */}
      {selectedIds.size > 0 && (
        <div className="emp-bulk-bar">
          <span>
            <i className="fa-solid fa-check-double" /> {selectedIds.size}명 선택됨
          </span>
          <button
            className="emp-bulk-btn"
            onClick={() => setBulkDeptDialog(true)}
          >
            <i className="fa-solid fa-building" /> 부서 일괄 변경
          </button>
          <button
            className="emp-bulk-btn emp-bulk-btn-ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            선택 해제
          </button>
        </div>
      )}

      {/* 테이블 */}
      <div className="emp-table-wrap">
        {usersLoading && users.length === 0 ? (
          <SkeletonTable rows={8} cols={6} />
        ) : usersError ? (
          <div className="emp-empty">
            <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--danger)' }} />
            <p>데이터를 불러오지 못했어요: {usersError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="emp-empty">
            <i className="fa-regular fa-folder-open" />
            <p>조건에 맞는 직원이 없습니다.</p>
          </div>
        ) : (
          <table className="emp-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>이름</th>
                <th>부서/직급</th>
                <th>연락처</th>
                <th>권한</th>
                <th>상태</th>
                <th style={{ width: 100, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isActive = u.is_active !== false;
                const checked = selectedIds.has(u.id);
                return (
                  <tr key={u.id} className={checked ? 'selected' : ''}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(u.id)}
                      />
                    </td>
                    <td>
                      <div className="emp-name">
                        <div
                          className="avatar"
                          style={{
                            width: 36,
                            height: 36,
                            backgroundImage: `url('${
                              u.avatar_url || 'https://i.pravatar.cc/150?u=' + u.id
                            }')`,
                          }}
                        />
                        <div>
                          <div className="emp-fullname">{u.full_name || '이름 없음'}</div>
                          <div className="emp-email">{u.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{u.department || '-'}</div>
                      <div className="emp-position">{u.position || ''}</div>
                    </td>
                    <td className="emp-phone">{u.phone || '-'}</td>
                    <td>
                      <button
                        type="button"
                        className={`emp-badge emp-badge-${u.is_admin ? 'admin' : 'user'}`}
                        onClick={() => handleToggleAdmin(u)}
                        title="클릭하여 권한 변경"
                      >
                        {u.is_admin ? (
                          <><i className="fa-solid fa-user-shield" /> 관리자</>
                        ) : (
                          <><i className="fa-solid fa-user" /> 일반</>
                        )}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`emp-badge emp-badge-${isActive ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActive(u)}
                        title="클릭하여 상태 변경"
                      >
                        <i className={`fa-solid fa-circle ${isActive ? '' : 'fa-circle-xmark'}`} style={{ fontSize: 7 }} />
                        {isActive ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="emp-action-btn"
                        onClick={() => setEditTarget(u)}
                      >
                        <i className="fa-solid fa-pen-to-square" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 일괄 부서 변경 다이얼로그 */}
      {bulkDeptDialog && (
        <div className="emp-dialog-overlay" onClick={() => setBulkDeptDialog(false)}>
          <div className="emp-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>부서 일괄 변경</h3>
            <p>선택한 {selectedIds.size}명의 부서를 변경합니다.</p>
            <input
              type="text"
              placeholder="새 부서명"
              value={bulkDeptValue}
              onChange={(e) => setBulkDeptValue(e.target.value)}
              autoFocus
              list="emp-dept-list"
            />
            <datalist id="emp-dept-list">
              {departments.map((d) => <option key={d} value={d} />)}
            </datalist>
            <div className="emp-dialog-actions">
              <button onClick={() => setBulkDeptDialog(false)} className="btn-ghost">취소</button>
              <button onClick={handleBulkDept} className="btn btn-in">변경</button>
            </div>
          </div>
        </div>
      )}

      {/* 편집 모달 */}
      <EmployeeEditModal
        user={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(updated) => {
          /* 상위 목록은 updateUser 가 자동으로 갱신함 */
          setEditTarget(null);
        }}
      />
    </section>
  );
}