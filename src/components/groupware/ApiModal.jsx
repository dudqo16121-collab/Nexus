import Modal from '../common/Modal';
import { useApi } from '../../contexts/ApiContext';

export default function ApiModal({ isOpen, onClose }) {
  const { services, toggleConnection } = useApi();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <>
          <i className="fa-solid fa-code-branch" style={{ color: 'var(--success)' }}></i>
          API 연동 센터
        </>
      }
    >
      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          marginBottom: 20,
        }}
      >
        외부 서비스를 NEXUS와 연동하여 협업 효율을 극대화하세요.
      </p>

      <div className="api-grid">
        {services.map((s) => (
          <div key={s.id} className="api-card">
            <div className="api-card-header">
              <div
                className="api-logo"
                style={{ background: s.iconBg, color: s.iconColor }}
              >
                <i className={s.icon}></i>
              </div>
              <h3>{s.name}</h3>
            </div>

            <p>{s.desc}</p>

            <div className="api-status">
              <div className={`api-dot ${s.connected ? 'dot-active' : 'dot-inactive'}`}></div>
              <span style={{ color: s.connected ? '#22c55e' : 'var(--text-muted)' }}>
                {s.connected ? '연결됨' : '연결 안 됨'}
              </span>
            </div>

            <button
              className={`api-connect-btn ${s.connected ? 'connected' : ''}`}
              onClick={() => toggleConnection(s.id)}
            >
              {s.connected ? (
                <>
                  <i className="fa-solid fa-unlink"></i> 연동 해제
                </>
              ) : (
                <>
                  <i className="fa-solid fa-link"></i> 연동 시작
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}