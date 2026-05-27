// 조직도 리스트 뷰 — 디렉토리 스타일.
// 정렬 가능 + 빠른 액션.

import { useState } from 'react';
import { useOrgChart } from '../../contexts/OrgChartContext';
import { useMessenger } from '../../contexts/MessengerContext';
import { useToast } from '../../contexts/ToastContext';

function avatarUrl(m) {
  if (m?.avatar_url) return m.avatar_url;
  return `https://i.pravatar.cc/150?u=${m?.id || 'x'}`;
}

function tenureLabel(hiredAt) {
  if (!hiredAt) return '-';
  const start = new Date(hiredAt);
  const now = new Date();
  const years = (now - start) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 1) {
    const months = Math.floor(years * 12);
    return months <= 0 ? '신규' : `${months}개월`;
  }
  return `${Math.floor(years)}년`;
}

function highlight(text, keyword) {
  if (!keyword || !text) return text;
  const kw = keyword.trim();
  if (!kw) return text;
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="org-highlight">{text.slice(idx, idx + kw.length)}</mark>
      {text.slice(idx + kw.length)}
    </>
  );
}

export default function OrgChartList() {
  const { filteredMembers, openDetail, search, getDeptInfo } = useOrgChart();
  const { openWith } = useMessenger();
  const toast = useToast();

  const [sortBy, setSortBy] = useState('name'); // 'name' | 'dept' | 'tenure'
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortAsc((v) => !v);
    } else {
      setSortBy(key);
      setSortAsc(true);
    }
  };

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let av, bv;
    if (sortBy === 'name') {
      av = (a.full_name || '').toLowerCase();
      bv = (b.full_name || '').toLowerCase();
    } else if (sortBy === 'dept') {
      av = (a.department || 'zz').toLowerCase();
      bv = (b.department || 'zz').toLowerCase();
    } else if (sortBy === 'tenure') {
      av = a.hired_at ? new Date(a.hired_at).getTime() : Infinity;
      bv = b.hired_at ? new Date(b.hired_at).getTime() : Infinity;
    }
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleMessage = (e, m) => {
    e.stopPropagation();
    if (typeof openWith === 'function') {
      openWith(m.id, m.full_name, m.avatar_url);
    }
  };

  const handleCopyPhone = (e, m) => {
    e.stopPropagation();
    if (!m.phone) {
      toast.info('전화번호가 등록되지 않았어요.');
      return;
    }
    navigator.clipboard?.writeText(m.phone)
      .then(() => toast.success(`${m.full_name}님 전화번호 복사됨`));
  };

  const sortIcon = (key) => {
    if (sortBy !== key) return 'fa-sort';
    return sortAsc ? 'fa-sort-up' : 'fa-sort-down';
  };

  return (
    <div className="org-list-wrap">
      <table className="org-list-table">
        <thead>
          <tr>
            <th style={{ width: '50px' }}></th>
            <th onClick={() => handleSort('name')} className="sortable">
              이름 <i className={`fa-solid ${sortIcon('name')}`} />
            </th>
            <th>직급</th>
            <th onClick={() => handleSort('dept')} className="sortable">
              부서 <i className={`fa-solid ${sortIcon('dept')}`} />
            </th>
            <th>연락처</th>
            <th onClick={() => handleSort('tenure')} className="sortable">
              입사 <i className={`fa-solid ${sortIcon('tenure')}`} />
            </th>
            <th style={{ width: '140px', textAlign: 'right' }}>액션</th>
          </tr>
        </thead>
        <tbody>
          {sortedMembers.map((m) => {
            const deptInfo = getDeptInfo(m.department);
            return (
              <tr
                key={m.id}
                className="org-list-row"
                onClick={() => openDetail(m)}
              >
                <td>
                  <div
                    className="org-list-avatar"
                    style={{ backgroundImage: `url('${avatarUrl(m)}')` }}
                  />
                </td>
                <td>
                  <span className="org-list-name">
                    {highlight(m.full_name || '이름 없음', search)}
                    {m.is_admin && (
                      <i
                        className="fa-solid fa-crown"
                        style={{ color: '#fbbf24', marginLeft: 5, fontSize: '0.78rem' }}
                        title="관리자"
                      />
                    )}
                  </span>
                  {m.status_msg && (
                    <span className="org-list-status">"{m.status_msg}"</span>
                  )}
                </td>
                <td>
                  <span className="org-list-position">{m.position || '-'}</span>
                </td>
                <td>
                  <span
                    className="org-list-dept-chip"
                    style={{
                      background: `${deptInfo.color}15`,
                      color: deptInfo.color,
                    }}
                  >
                    <i className={`fa-solid ${deptInfo.icon}`} />
                    {highlight(m.department || '미지정', search)}
                  </span>
                </td>
                <td>
                  <span className="org-list-phone">
                    {m.phone || '-'}
                  </span>
                </td>
                <td>
                  <span className="org-list-tenure">
                    {tenureLabel(m.hired_at)}
                  </span>
                </td>
                <td>
                  <div
                    className="org-list-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="org-list-action-btn message"
                      onClick={(e) => handleMessage(e, m)}
                      title="메시지"
                    >
                      <i className="fa-solid fa-message" />
                    </button>
                    <button
                      type="button"
                      className="org-list-action-btn phone"
                      onClick={(e) => handleCopyPhone(e, m)}
                      disabled={!m.phone}
                      title="전화번호 복사"
                    >
                      <i className="fa-solid fa-phone" />
                    </button>
                    <button
                      type="button"
                      className="org-list-action-btn detail"
                      onClick={() => openDetail(m)}
                      title="상세"
                    >
                      <i className="fa-solid fa-arrow-right" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}