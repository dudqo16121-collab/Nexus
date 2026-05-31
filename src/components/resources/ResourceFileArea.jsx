// 파일 영역 — 그리드 또는 리스트 모드.

import { useResource } from '../../contexts/ResourceContext';
import ResourceFileCard from './ResourceFileCard';
import ResourceFileRow from './ResourceFileRow';

export default function ResourceFileArea() {
  const {
    filteredResources, resources, viewMode,
    loading, error, keyword, activeView,
  } = useResource();

  if (loading) {
    return (
      <div className="resource-empty-state">
        <i className="fa-solid fa-spinner fa-spin" />
        <p>파일을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="resource-empty-state error">
        <i className="fa-solid fa-triangle-exclamation" />
        <p>자료를 불러오지 못했습니다: {error}</p>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="resource-empty-state">
        <i className="fa-regular fa-folder-open" />
        <p>업로드된 파일이 없습니다</p>
        <span>첫 파일을 업로드해보세요</span>
      </div>
    );
  }

  if (filteredResources.length === 0) {
    let msg = '';
    if (keyword.trim()) {
      msg = `"${keyword}" 검색 결과가 없습니다`;
    } else if (activeView === 'favorites') {
      msg = '즐겨찾기한 파일이 없습니다';
    } else if (activeView === 'recent') {
      msg = '최근 본 파일이 없습니다';
    } else if (activeView === 'mine') {
      msg = '내가 업로드한 파일이 없습니다';
    } else if (activeView === 'shared') {
      msg = '공유받은 파일이 없습니다';
    } else {
      msg = '이 카테고리에 파일이 없습니다';
    }
    return (
      <div className="resource-empty-state">
        <i className="fa-regular fa-folder-open" />
        <p>{msg}</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="resource-list-view">
        <div className="resource-list-header">
          <span style={{ flex: 2 }}>이름</span>
          <span style={{ width: 120 }}>카테고리</span>
          <span style={{ width: 100 }}>크기</span>
          <span style={{ width: 100 }}>공개</span>
          <span style={{ width: 110 }}>업로드</span>
          <span style={{ width: 80 }}></span>
        </div>
        <div className="resource-list-body">
          {filteredResources.map((res) => (
            <ResourceFileRow key={res.id} resource={res} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="resource-grid-view">
      {filteredResources.map((res) => (
        <ResourceFileCard key={res.id} resource={res} />
      ))}
    </div>
  );
}