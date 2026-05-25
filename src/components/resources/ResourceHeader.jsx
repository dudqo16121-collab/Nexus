// components/resources/ResourceHeader.jsx
// 자료실 페이지 헤더 — 원본 view-resource <header> 이관.
// 파일 검색 + 파일 업로드 버튼 (숨겨진 file input 트리거).

import { useRef } from 'react';
import { useResource } from '../../contexts/ResourceContext';
import { useToast } from '../../contexts/ToastContext';

export default function ResourceHeader() {
  const toast = useToast();
  const { keyword, setKeyword, uploadFiles, uploading } = useResource();
  const fileInputRef = useRef(null);

  /* 업로드 버튼 → 숨겨진 input 클릭 — 원본 패턴 그대로 */
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  /* 파일 선택 시 업로드 */
  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const result = await uploadFiles(files);
    // 같은 파일 다시 선택 가능하도록 input 초기화
    e.target.value = '';

    if (result.ok) {
      toast.success(`${result.count}개 파일 업로드가 완료되었습니다.`);
    } else {
      toast.error(`업로드 실패: ${result.error || ''}`);
    }
  };

  return (
    <header
      style={{
        background: 'transparent',
        backdropFilter: 'none',
        position: 'relative',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>자료실</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          팀원들과 파일 및 문서를 안전하게 공유하세요.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <div className="search-box" style={{ width: 250 }}>
          <i
            className="fa-solid fa-magnifying-glass"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="파일 검색..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {/* 숨겨진 파일 input — 원본 #hidden-file-input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="btn btn-in"
          style={{ width: 'auto', padding: '10px 20px', whiteSpace: 'nowrap' }}
          onClick={handleUploadClick}
          disabled={uploading}
        >
          <i className="fa-solid fa-cloud-arrow-up" />{' '}
          {uploading ? '업로드 중...' : '파일 업로드'}
        </button>
      </div>
    </header>
  );
}