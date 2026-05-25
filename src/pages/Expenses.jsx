// pages/Expenses.jsx
// 법인카드 정산 메인 페이지.
// 원본 index.html <section id="view-expenses"> 전체를 React 로 이관.
//
// 구조:
//   ExpenseHeader          — 정산 신청 / 지출 등록 버튼
//   ExpenseStatsGrid       — 통계 위젯 4개
//   [차트 + 최근 정산]      — ExpenseCategoryChart / ExpenseRecentReports
//   [내역 패널]            — ExpenseFilterBar + 탭별 테이블
//   모달 3종               — 지출 등록·수정 / 정산 신청서 / 정산 상세
//
// 데이터·모달 상태는 ExpenseProvider 가 공급한다. App 트리에 ExpenseProvider 를
// 추가하고 /expenses 라우트를 이 페이지로 교체할 것.

import { useExpense } from '../contexts/ExpenseContext';

import ExpenseHeader from '../components/expenses/ExpenseHeader';
import ExpenseStatsGrid from '../components/expenses/ExpenseStatsGrid';
import ExpenseCategoryChart from '../components/expenses/ExpenseCategoryChart';
import ExpenseRecentReports from '../components/expenses/ExpenseRecentReports';
import ExpenseFilterBar from '../components/expenses/ExpenseFilterBar';
import ExpenseRecordsTable from '../components/expenses/ExpenseRecordsTable';
import ExpenseReportsTable from '../components/expenses/ExpenseReportsTable';
import ExpenseRecordModal from '../components/expenses/ExpenseRecordModal';
import ExpenseReportModal from '../components/expenses/ExpenseReportModal';
import ExpenseReportViewModal from '../components/expenses/ExpenseReportViewModal';

export default function Expenses() {
  const { tab, setTab } = useExpense();

  return (
    <section id="view-expenses">
      <ExpenseHeader />

      {/* 통계 위젯 */}
      <ExpenseStatsGrid />

      {/* 차트 + 최근 정산 신청 */}
      <div className="expense-top-layout">
        <section className="panel">
          <div className="panel-header" style={{ marginBottom: 15 }}>
            <h2>
              <i
                className="fa-solid fa-chart-pie"
                style={{ color: 'var(--primary-color)', marginRight: 6 }}
              />
              카테고리별 지출
            </h2>
            <span
              style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}
            >
              이번달 기준
            </span>
          </div>
          <ExpenseCategoryChart />
        </section>

        <section className="panel">
          <div className="panel-header" style={{ marginBottom: 15 }}>
            <h2>
              <i
                className="fa-solid fa-file-invoice-dollar"
                style={{ color: 'var(--warning)', marginRight: 6 }}
              />
              최근 정산 신청
            </h2>
            <span
              style={{
                color: 'var(--primary-color)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setTab('reports')}
            >
              전체보기{' '}
              <i
                className="fa-solid fa-arrow-right"
                style={{ marginLeft: 3 }}
              />
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            <ExpenseRecentReports />
          </div>
        </section>
      </div>

      {/* 지출/정산 내역 패널 */}
      <section className="panel" style={{ marginTop: 20 }}>
        <ExpenseFilterBar />
        {tab === 'records' ? <ExpenseRecordsTable /> : <ExpenseReportsTable />}
      </section>

      {/* 모달 3종 — 항상 마운트, 내부에서 isOpen 으로 표시 제어 */}
      <ExpenseRecordModal />
      <ExpenseReportModal />
      <ExpenseReportViewModal />
    </section>
  );
}
