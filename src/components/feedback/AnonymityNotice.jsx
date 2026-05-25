// components/feedback/AnonymityNotice.jsx
// 익명성 보장 안내 — 신뢰도의 핵심. 접었다 펼치는 카드.

import { useState } from 'react';

export default function AnonymityNotice() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`fb-anon-notice ${expanded ? 'expanded' : ''}`}>
      <button
        type="button"
        className="fb-anon-head"
        onClick={() => setExpanded((v) => !v)}
      >
        <i className="fa-solid fa-shield-halved" />
        <strong>🔒 익명 보장 — 어떻게 작동하나요?</strong>
        <i className={`fa-solid fa-chevron-down fb-anon-toggle ${expanded ? 'open' : ''}`} />
      </button>

      {expanded && (
        <div className="fb-anon-body">
          <ul>
            <li>
              <strong>물리적 익명</strong>: 피드백 테이블에는 작성자 ID 컬럼이 <em>아예 존재하지 않습니다</em>.
              데이터베이스를 직접 조회해도 누가 썼는지 알 수 없습니다.
            </li>
            <li>
              <strong>본인 인증 분리</strong>: 본인 글 수정/삭제용 토큰은 이 브라우저에만 저장됩니다.
              관리자도 토큰과 작성자를 연결할 방법이 없습니다.
            </li>
            <li>
              <strong>역추적 방지</strong>: 부서·연차는 큰 단위로만, 작성일은 주 단위로만 표시되어
              "어느 날 어느 부서가 썼는지"로 추측할 수 없습니다.
            </li>
            <li>
              <strong>다만</strong>: 본문에 본인을 특정할 수 있는 내용(이름·구체적 사건)을 쓰면
              내용 자체로 추측될 수 있으니 주의해 주세요.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}