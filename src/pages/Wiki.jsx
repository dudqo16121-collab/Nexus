// pages/Wiki.jsx
// 좌측 사이드바 + 중앙 에디터 + 우측 목차

import { useEffect } from 'react';
import { useWiki } from '../contexts/WikiContext';
import WikiSidebar from '../components/wiki/WikiSidebar';
import WikiEditor from '../components/wiki/WikiEditor';

export default function Wiki() {
  const { fetchDocuments } = useWiki();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <section id="view-wiki" style={{ padding: 0 }}>
      <div
        className="wiki-container wiki-fullpage"
        style={{
          display: 'flex',
          gap: 0,
          height: 'calc(100vh - var(--topbar-height, 64px) - 30px)',
          minHeight: 520,
        }}
      >
        <WikiSidebar />
        <WikiEditor />
      </div>
    </section>
  );
}