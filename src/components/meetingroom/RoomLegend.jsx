// components/meetingroom/RoomLegend.jsx
// 슬롯 색상 범례 — 원본 view-meeting-room 하단 범례 이관.

const items = [
  {
    label: '예약가능',
    style: {
      background: 'var(--panel-bg)',
      border: '1px solid var(--border-color)',
    },
  },
  { label: '타부서 예약', style: { background: 'var(--primary-color)' } },
  { label: '내 예약(수정/삭제)', style: { background: 'var(--danger)' } },
];

export default function RoomLegend() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 15,
        marginTop: 30,
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
      }}
    >
      {items.map((it) => (
        <span
          key={it.label}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <span
            style={{ width: 12, height: 12, borderRadius: 2, ...it.style }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}