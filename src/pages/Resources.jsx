// pages/Resources.jsx
// 자료실 — 사이드바(카테고리/뷰) + 메인(헤더 + 파일 영역) + 모달들.

import ResourceSidebar from '../components/resources/ResourceSidebar';
import ResourceMainHeader from '../components/resources/ResourceMainHeader';
import ResourceFileArea from '../components/resources/ResourceFileArea';
import ResourceDetailModal from '../components/resources/ResourceDetailModal';
import ResourceUploadModal from '../components/resources/ResourceUploadModal';

export default function Resources() {
  return (
    <section id="view-resource">
      <div className="resource-layout">
        <ResourceSidebar />
        <main className="resource-main">
          <ResourceMainHeader />
          <ResourceFileArea />
        </main>
      </div>

      <ResourceDetailModal />
      <ResourceUploadModal />
    </section>
  );
}