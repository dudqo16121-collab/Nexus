import { useEffect, useState } from 'react';

/**
 * 빠른 메모 — localStorage 자동 저장
 * 원본은 Supabase 저장이었지만, 일단 로컬 저장으로 시작
 */
export default function QuickMemo() {
  const [memo, setMemo] = useState(
    () => localStorage.getItem('nexus_quick_memo') || ''
  );

  /* 입력할 때마다 자동 저장 (300ms 디바운스) */
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('nexus_quick_memo', memo);
    }, 300);
    return () => clearTimeout(timer);
  }, [memo]);

  return (
    <section className="panel">
      <div className="panel-header" style={{ marginBottom: 10 }}>
        <h2>빠른 메모</h2>
      </div>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="여기에 메모를 작성하세요... (자동 저장됨)"
        style={{
          width: '100%',
          height: 120,
          border: 'none',
          outline: 'none',
          resize: 'none',
          background: 'transparent',
          color: 'var(--text-main)',
          fontSize: '0.95rem',
          lineHeight: 1.5,
          fontFamily: 'inherit',
        }}
      />
    </section>
  );
}