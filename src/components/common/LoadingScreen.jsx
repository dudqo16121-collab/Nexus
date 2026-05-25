import { SkeletonFullScreen } from './Skeleton';

export default function LoadingScreen({ label = '로딩 중...' }) {
  return <SkeletonFullScreen label={label} />;
}