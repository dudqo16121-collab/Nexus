import { useNavigate } from 'react-router-dom';

const LINKS = [
  { icon: 'fa-sitemap',         label: '그룹웨어',     to: '/groupware', color: undefined },
  { icon: 'fa-book-bookmark',   label: '사내 위키',    to: '/wiki',      color: '#9d4edd' },
  { icon: 'fa-credit-card',     label: '법인카드 정산', to: '/expenses',  color: 'var(--success)' },
  { icon: 'fa-trophy',          label: 'INJOY Hub',   to: '/injoyhub',  color: 'var(--warning)' },
];

export default function QuickLinks() {
  const navigate = useNavigate();

  return (
    <section className="panel">
      <div className="panel-header" style={{ marginBottom: 15 }}>
        <h2>
          <i className="fa-solid fa-bolt" style={{ color: 'var(--warning)', marginRight: 8 }}></i>
          빠른 실행
        </h2>
        <i className="fa-solid fa-gear" style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }} title="메뉴 편집"></i>
      </div>
      <div className="quick-link-grid">
        {LINKS.map((link) => (
          <div
            key={link.label}
            className="quick-link-item"
            onClick={() => navigate(link.to)}
          >
            <i className={`fa-solid ${link.icon}`} style={link.color ? { color: link.color } : undefined}></i>
            <span>{link.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}