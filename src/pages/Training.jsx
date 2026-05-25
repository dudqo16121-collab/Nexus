// pages/Training.jsx
// 교육/연수 관리 페이지.

import TrainingHeader from '../components/training/TrainingHeader';
import TrainingSidebar from '../components/training/TrainingSidebar';
import TrainingGrid from '../components/training/TrainingGrid';
import TrainingDetailModal from '../components/training/TrainingDetailModal';
import TrainingEditorModal from '../components/training/TrainingEditorModal';

export default function Training() {
  return (
    <section id="view-training">
      <TrainingHeader />
      <div className="training-layout">
        <TrainingSidebar />
        <main className="training-main">
          <TrainingGrid />
        </main>
      </div>
      <TrainingDetailModal />
      <TrainingEditorModal />
    </section>
  );
}