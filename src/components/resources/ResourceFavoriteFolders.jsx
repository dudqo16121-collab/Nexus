// components/resources/ResourceFavoriteFolders.jsx
// 즐겨찾는 폴더 패널 — 원본 view-resource 의 "즐겨찾는 폴더" 블록 이관.
//
// 주의: 원본에서 이 영역은 정적 하드코딩이다 (폴더 기능 자체가 원본에 없음).
//       실제 폴더 시스템이 필요해지면 별도 설계가 필요하다. 지금은 원본과
//       동일하게 정적 표시만 한다.

const FOLDERS = [
  { name: '공통 양식 모음', count: 24 },
  { name: '2026 프로젝트 기획', count: 8 },
  { name: '마케팅 리소스', count: 156 },
];

export default function ResourceFavoriteFolders() {
  return (
    <div className="panel" style={{ marginBottom: 25 }}>
      <h3
        style={{ marginBottom: 15, color: 'var(--text-main)', fontSize: '1.1rem' }}
      >
        즐겨찾는 폴더
      </h3>
      <div className="resource-grid" style={{ marginTop: 0 }}>
        {FOLDERS.map((f) => (
          <div className="file-card" key={f.name}>
            <i className="fa-solid fa-folder file-icon folder" />
            <h4>{f.name}</h4>
            <p>항목 {f.count}개</p>
          </div>
        ))}
      </div>
    </div>
  );
}