// components/resources/ResourceFileGrid.jsx
// 업로드된 파일 그리드 — 원본 #dynamic-resource-list + renderResources 이관.
// 검색 키워드가 적용된 filteredResources 를 렌더한다.

import { useResource } from '../../contexts/ResourceContext';
import ResourceFileCard from './ResourceFileCard';

const msgStyle = {
  gridColumn: '1 / -1',
  textAlign: 'center',
  padding: 20,
  color: 'var(--text-muted)',
};

export default function ResourceFileGrid() {
  const { filteredResources, resources, loading, error, keyword } =
    useResource();

  return (
    <div className="panel">
      <h3
        style={{ marginBottom: 15, color: 'var(--text-main)', fontSize: '1.1rem' }}
      >
        업로드된 파일
      </h3>

      <div className="resource-grid" style={{ marginTop: 0 }}>
        {loading && <p style={msgStyle}>파일을 불러오는 중...</p>}

        {!loading && error && (
          <p style={{ ...msgStyle, color: 'var(--danger)' }}>
            자료를 불러오지 못했습니다: {error}
          </p>
        )}

        {!loading && !error && resources.length === 0 && (
          <p style={msgStyle}>업로드된 파일이 없습니다.</p>
        )}

        {/* 검색 결과 없음 (파일은 있지만 키워드에 안 걸림) */}
        {!loading &&
          !error &&
          resources.length > 0 &&
          filteredResources.length === 0 && (
            <p style={msgStyle}>
              '{keyword}' 검색 결과가 없습니다.
            </p>
          )}

        {!loading &&
          !error &&
          filteredResources.map((res) => (
            <ResourceFileCard key={res.id} resource={res} />
          ))}
      </div>
    </div>
  );
}