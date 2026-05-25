// components/common/ErrorBoundary.jsx
// React 에러 바운더리 — 자식 트리에서 throw 된 렌더링 에러를 잡아서
// 흰화면 대신 친화적 폴백 UI 를 보여준다.
//
// 사용법:
//   <ErrorBoundary>
//     <SomeComponent />
//   </ErrorBoundary>
//
// 또는 커스터마이즈:
//   <ErrorBoundary
//     fallback={(error, reset) => <MyFallback ... />}
//     onError={(error, info) => myLogger(error)}
//     scope="dashboard"
//   >
//     ...
//   </ErrorBoundary>
//
// 주의:
//   - 이벤트 핸들러 안에서 throw 된 에러는 React 가 안 잡는다 (try/catch 직접 써야 함).
//   - async 함수 안 에러도 안 잡힌다. 마찬가지로 try/catch 또는 .catch 필요.
//   - 잡히는 건 렌더 / lifecycle / hook 에서 동기적으로 throw 된 에러.

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    /* 콘솔에 항상 남긴다 — production 에서도 디버깅에 필수 */
    console.error(
      `[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ''}]`,
      error,
      info
    );
    this.setState({ info });
    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, info);
      } catch (_) {
        /* onError 자체가 throw 해도 무시 — 무한 루프 방지 */
      }
    }
  }

  /* 라우트 변경 등으로 부모가 자식 트리를 바꾸면 자동 복구되도록
     resetKeys prop 을 지원. 값이 바뀌면 error 상태 리셋. */
  componentDidUpdate(prevProps) {
    const { error } = this.state;
    if (!error) return;
    const prev = prevProps.resetKeys;
    const next = this.props.resetKeys;
    if (Array.isArray(prev) && Array.isArray(next)) {
      if (prev.length !== next.length || prev.some((v, i) => v !== next[i])) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    /* 사용자 지정 fallback 우선 */
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(error, this.reset);
    }

    /* 기본 폴백 UI */
    return (
      <div className="error-boundary">
        <div className="error-boundary-inner">
          <div className="error-boundary-icon">
            <i className="fa-solid fa-circle-exclamation" />
          </div>
          <h2 className="error-boundary-title">
            앗, 화면을 불러오는 중 문제가 발생했어요
          </h2>
          <p className="error-boundary-message">
            일시적인 오류일 수 있어요. 다시 시도하거나 페이지를 새로고침해주세요.
          </p>

          {/* 개발 모드에서만 에러 상세 노출 (production 에서 사용자에게 스택은 부담) */}
          {import.meta.env?.DEV && (
            <details className="error-boundary-details">
              <summary>에러 상세 (개발용)</summary>
              <pre>{error?.message || String(error)}</pre>
              {error?.stack && <pre>{error.stack}</pre>}
            </details>
          )}

          <div className="error-boundary-actions">
            <button
              type="button"
              className="btn btn-out"
              onClick={this.reset}
              style={{ width: 'auto', padding: '10px 20px' }}
            >
              <i className="fa-solid fa-rotate-right" /> 다시 시도
            </button>
            <button
              type="button"
              className="btn btn-in"
              onClick={() => window.location.reload()}
              style={{ width: 'auto', padding: '10px 20px' }}
            >
              <i className="fa-solid fa-arrows-rotate" /> 새로고침
            </button>
          </div>
        </div>
      </div>
    );
  }
}