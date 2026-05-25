// components/admin/AdminRoomsTab.jsx
// 회의실 관리 탭 — 원본 tab-rooms + loadAdminRooms / addMeetingRoom /
// deleteMeetingRoom 이관.
//
// 회의실 데이터/로직은 MeetingRoomContext 를 재사용한다 (addRoom/deleteRoom/rooms).
// 회의실 추가는 이 탭 안에 인라인 폼으로 둔다 (원본은 별도 모달이었으나,
// 입력 필드 3개뿐이라 인라인이 더 단순하고 모달 중첩을 피한다).
//
// 주의: 회의실 삭제는 영구 삭제다. window.confirm 후에만 호출.

import { useState } from 'react';
import { useMeetingRoom } from '../../contexts/MeetingRoomContext';
import { useToast } from '../../contexts/ToastContext';

const thStyle = { color: 'var(--text-muted)', padding: '15px 0' };

export default function AdminRoomsTab() {
  const toast = useToast();
  const { rooms, loading, error, addRoom, deleteRoom } = useMeetingRoom();

  /* 회의실 추가 폼 상태 */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: '', equipment: '' });
  const [submitting, setSubmitting] = useState(false);

  const patch = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleAdd = async () => {
    if (!form.name.trim() || !form.capacity) {
      toast.warning('회의실 이름과 수용인원을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const result = await addRoom(form);
    setSubmitting(false);

    if (result.ok) {
      toast.success('회의실이 추가되었습니다.');
      setForm({ name: '', capacity: '', equipment: '' });
      setShowForm(false);
    } else {
      toast.error(`회의실 추가 실패: ${result.error || ''}`);
    }
  };

  const handleDelete = async (room) => {
    if (
      !window.confirm(
        `"${room.name}" 회의실을 정말 삭제하시겠습니까?\n관련 예약 내역도 삭제될 수 있습니다.`
      )
    )
      return;
    const result = await deleteRoom(room.id);
    if (result.ok) {
      toast.success('회의실이 삭제되었습니다.');
    } else {
      toast.error(`삭제 실패: ${result.error || ''}`);
    }
  };

  const inputStyle = {
    padding: '10px 13px',
    borderRadius: 8,
    border: '1px solid var(--border-color)',
    background: 'var(--input-bg)',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    outline: 'none',
  };

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
          사내 회의실 관리
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
          onClick={() => setShowForm((v) => !v)}
        >
          <i className={`fa-solid ${showForm ? 'fa-xmark' : 'fa-plus'}`} />{' '}
          {showForm ? '취소' : '회의실 추가'}
        </button>
      </div>

      {/* 회의실 추가 인라인 폼 */}
      {showForm && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 15,
            padding: 15,
            border: '1px solid var(--border-color)',
            borderRadius: 10,
            background: 'var(--hover-bg)',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="회의실 이름 (예: 대회의실 A)"
            value={form.name}
            onChange={(e) => patch('name', e.target.value)}
            style={{ ...inputStyle, flex: 2, minWidth: 160 }}
          />
          <input
            type="number"
            placeholder="수용 인원"
            value={form.capacity}
            onChange={(e) => patch('capacity', e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 100 }}
          />
          <input
            type="text"
            placeholder="비품 정보 (예: 빔프로젝터)"
            value={form.equipment}
            onChange={(e) => patch('equipment', e.target.value)}
            style={{ ...inputStyle, flex: 2, minWidth: 160 }}
          />
          <button
            type="button"
            className="btn btn-in"
            style={{ width: 'auto', padding: '8px 18px', fontSize: '0.85rem' }}
            onClick={handleAdd}
            disabled={submitting}
          >
            {submitting ? '처리 중...' : '등록'}
          </button>
        </div>
      )}

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
              <th style={{ ...thStyle, padding: '15px 20px' }}>회의실명</th>
              <th style={thStyle}>수용인원</th>
              <th style={thStyle}>비품</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={4}
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

            {!loading && error && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: 'center',
                    padding: 20,
                    color: 'var(--danger)',
                  }}
                >
                  데이터를 불러오지 못했습니다: {error}
                </td>
              </tr>
            )}

            {!loading && !error && rooms.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: 'center',
                    padding: 20,
                    color: 'var(--text-muted)',
                  }}
                >
                  등록된 회의실이 없습니다.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              rooms.map((room) => (
                <tr
                  key={room.id}
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <td
                    style={{
                      padding: '12px 20px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                    }}
                  >
                    {room.name}
                  </td>
                  <td>{room.capacity}명</td>
                  <td>
                    {/* 원본 equipment 는 <i> 태그 포함 HTML 일 수 있음.
                        데이터 출처가 사내 관리자 입력으로 신뢰 범위. */}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: room.equipment || '-',
                      }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="admin-action-btn danger"
                      onClick={() => handleDelete(room)}
                    >
                      삭제
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