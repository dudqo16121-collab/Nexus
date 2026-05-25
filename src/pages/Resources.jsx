// pages/Resources.jsx
// 자료실 메인 페이지.
// 원본 index.html <section id="view-resource"> 전체를 React 로 이관.

import ResourceHeader from '../components/resources/ResourceHeader';
import ResourceFavoriteFolders from '../components/resources/ResourceFavoriteFolders';
import ResourceFileGrid from '../components/resources/ResourceFileGrid';

export default function Resources() {
  return (
    <section id="view-resource">
      <ResourceHeader />
      <ResourceFavoriteFolders />
      <ResourceFileGrid />
    </section>
  );
}