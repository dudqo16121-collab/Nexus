// components/feedback/admin/KeywordCloud.jsx
// 빈도 기반 키워드 클라우드 — 폰트 사이즈로 가중치 표현.

import { useFeedback } from '../../../contexts/FeedbackContext';

export default function KeywordCloud() {
  const { keywordCloud, setFilter, filter } = useFeedback();

  if (keywordCloud.length === 0) {
    return (
      <div className="fb-chart-empty">
        <i className="fa-solid fa-cloud" />
        <p>키워드를 추출하려면 더 많은 피드백이 필요해요</p>
        <small>(같은 단어가 2번 이상 등장하면 표시돼요)</small>
      </div>
    );
  }

  const maxCount = keywordCloud[0].count;
  const minCount = keywordCloud[keywordCloud.length - 1].count;
  const range = Math.max(1, maxCount - minCount);

  /* 0~1 정규화 */
  const normalize = (c) => (c - minCount) / range;

  /* 색상 팔레트 (낮음→높음) */
  const palette = ['#94a3b8', '#64748b', '#4361ee', '#8338ec', '#f72585'];

  const handleClick = (word) => {
    // 검색 필터에 자동 적용
    setFilter({ ...filter, search: word });
  };

  return (
    <div className="fb-keywords">
      {keywordCloud.map(({ word, count }) => {
        const n = normalize(count);
        const fontSize = 0.78 + n * 0.9;
        const colorIdx = Math.min(palette.length - 1, Math.floor(n * palette.length));
        return (
          <button
            key={word}
            type="button"
            className="fb-keyword"
            style={{
              fontSize: `${fontSize}rem`,
              color: palette[colorIdx],
              opacity: 0.65 + n * 0.35,
            }}
            onClick={() => handleClick(word)}
            title={`${count}회 등장 — 클릭해서 검색`}
          >
            {word}
            <sub style={{ fontSize: '0.55em', marginLeft: 2 }}>{count}</sub>
          </button>
        );
      })}
    </div>
  );
}