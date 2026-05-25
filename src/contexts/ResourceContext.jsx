// contexts/ResourceContext.jsx
// 자료실 데이터 로직 단일 출처.
// 원본 script.js 18번(자료실) 블록 — loadResources / setupRealResourceSystem /
// deleteResource 를 React 상태로 이관.
//
// 설계 메모:
//  - 파일 업로드/삭제/URL 은 NexusFile 모듈(nexusFile.js)을 재사용한다.
//    원본의 직접 supabase.storage 호출 대신 NexusFile.uploadMany / remove /
//    getPublicUrl 을 쓴다 (게시판·위키와 동일 패턴).
//  - resources 테이블 컬럼: file_name, file_size, file_url, storage_path, user_id.
//  - 원본의 데모 데이터 폴백은 옮기지 않는다. 로그인 사용자 기준으로만 동작.
//  - 파일 삭제는 영구 삭제이므로 Context 는 함수만 제공하고, 실제 호출은
//    UI 에서 window.confirm 을 거친 뒤에만 일어난다.
//  - Realtime 대신 명시적 refetch (디버깅 메모: Realtime + StrictMode 충돌 회피).

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
// ⚠️ nexusFile 경로 확인 필요 — 프로젝트에서 nexusFile.js 위치에 맞출 것.
//    게시판/위키가 NexusFile 을 어떻게 import 하는지 보고 동일하게 맞추세요.
//    (후보: '../lib/nexusFile' 또는 '../nexusFile')
import { uploadMany, remove, getPublicUrl } from '../lib/nexusFile';

const ResourceContext = createContext(null);

/* 자료실 업로드 시 Storage 폴더 — NexusFile 의 folder 인자 */
const RESOURCE_FOLDER = 'resource';

export function ResourceProvider({ children }) {
  const { user } = useAuth();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  /* 검색 키워드 — 원본 자료실 헤더의 검색창 */
  const [keyword, setKeyword] = useState('');

  /* StrictMode 이중 호출 / 언마운트 후 setState 방어 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ── 자료 목록 로드 — 원본 loadResources 이관 ── */
  const refresh = useCallback(async () => {
    if (!user) {
      setResources([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      if (!mountedRef.current) return;
      setResources(data || []);
    } catch (err) {
      console.error('[ResourceContext.refresh]', err);
      if (mountedRef.current) {
        setError(err.message || '자료를 불러오지 못했습니다.');
        setResources([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  /* 최초 로드 + user 변경 시 재로드 */
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ── 파일 업로드 — 원본 setupRealResourceSystem 이관 ──
     NexusFile.uploadMany 로 Storage 에 올린 뒤 resources 테이블에 메타 insert.
     여러 파일 선택 가능 (원본은 1개씩이었으나 NexusFile 이 다중 지원).
     fileList: FileList | File[] */
  const uploadFiles = useCallback(
    async (fileList) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      const files = Array.from(fileList || []);
      if (files.length === 0) return { ok: false, error: '파일이 없습니다.' };

      setUploading(true);
      try {
        // 1) Storage 업로드 — 실패한 파일은 NexusFile 이 건너뜀
        const uploaded = await uploadMany(files, RESOURCE_FOLDER);
        if (uploaded.length === 0) {
          throw new Error('업로드된 파일이 없습니다. (용량/형식 확인)');
        }

        // 2) resources 테이블에 메타 insert
        const rows = uploaded.map((f) => ({
          file_name: f.name,
          file_size: f.size,
          file_url: getPublicUrl(f.path),
          storage_path: f.path,
          user_id: user.id,
        }));
        const { error: dbErr } = await supabase
          .from('resources')
          .insert(rows);
        if (dbErr) throw dbErr;

        await refresh();
        return { ok: true, count: uploaded.length };
      } catch (err) {
        console.error('[ResourceContext.uploadFiles]', err);
        return {
          ok: false,
          error: err.message || '업로드에 실패했습니다.',
        };
      } finally {
        if (mountedRef.current) setUploading(false);
      }
    },
    [user, refresh]
  );

  /* ── 파일 삭제 — 원본 deleteResource 이관 ──
     영구 삭제. UI 에서 window.confirm 후에만 호출할 것.
     Storage 객체 + resources 행을 함께 삭제. */
  const deleteResource = useCallback(
    async (id) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        // storage_path 조회 후 Storage 객체 삭제
        const target = resources.find((r) => r.id === id);
        const storagePath = target?.storage_path;
        if (storagePath) {
          await remove(storagePath); // NexusFile — 실패해도 내부에서 로깅만
        }

        const { error: err } = await supabase
          .from('resources')
          .delete()
          .eq('id', id);
        if (err) throw err;

        await refresh();
        return { ok: true };
      } catch (err) {
        console.error('[ResourceContext.deleteResource]', err);
        return {
          ok: false,
          error: err.message || '파일 삭제 중 오류가 발생했습니다.',
        };
      }
    },
    [user, resources, refresh]
  );

  /* 검색 필터 적용된 목록 — 파일명 부분 일치 (원본 검색창 대응) */
  const filteredResources = keyword.trim()
    ? resources.filter((r) =>
        (r.file_name || '').toLowerCase().includes(keyword.trim().toLowerCase())
      )
    : resources;

  const value = {
    resources,
    filteredResources,
    loading,
    error,
    uploading,
    keyword,
    setKeyword,
    refresh,
    uploadFiles,
    deleteResource,
  };

  return (
    <ResourceContext.Provider value={value}>
      {children}
    </ResourceContext.Provider>
  );
}

export function useResource() {
  const ctx = useContext(ResourceContext);
  if (!ctx) {
    throw new Error('useResource must be used within a ResourceProvider');
  }
  return ctx;
}