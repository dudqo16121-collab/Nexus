// utils/projectReportExport.js
// 프로젝트 완료 보고서 — HTML(인쇄/PDF용) + Markdown 익스포트.

import { PRIORITY_META } from '../config/projectConfig';

/* ─── 날짜 포맷 ──────────────────────────────────────────────── */
function fmtDate(s) {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return s;
  }
}

function fmtDatetime(s) {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleString('ko-KR');
  } catch {
    return s;
  }
}

/* 텍스트의 줄바꿈을 HTML <br>로 변환 + XSS 방지 */
function escapeAndBreak(text) {
  if (!text) return '<em style="color:#888">(작성되지 않음)</em>';
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\n/g, '<br>');
}

/* ─── HTML 보고서 생성 ──────────────────────────────────────── */
export function buildReportHTML(project, report, snapshot) {
  const pri = PRIORITY_META[project.priority] || {};
  const snap = snapshot || report.snapshot || {};

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeAndBreak(project.title)} — 프로젝트 완료 보고서</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Noto Sans KR", "Malgun Gothic", sans-serif;
    line-height: 1.7;
    color: #1a1a1a;
    max-width: 800px;
    margin: 40px auto;
    padding: 0 24px;
    background: #fff;
  }
  .cover {
    border-bottom: 3px solid ${project.color || '#4361ee'};
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  .cover-label {
    display: inline-block;
    padding: 4px 10px;
    background: ${project.color || '#4361ee'};
    color: #fff;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
  h1 {
    font-size: 28px;
    margin: 0 0 8px;
    color: #111;
  }
  .desc {
    color: #555;
    font-size: 15px;
    margin: 0;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 24px;
    margin: 24px 0 0;
    padding: 18px 20px;
    background: #f8f9fb;
    border-radius: 10px;
    font-size: 14px;
  }
  .meta-item { display: flex; align-items: baseline; gap: 8px; }
  .meta-label { color: #777; font-size: 12px; min-width: 70px; }
  .meta-value { color: #222; font-weight: 600; }
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin: 28px 0;
  }
  .stat-card {
    background: ${project.color || '#4361ee'}10;
    border: 1px solid ${project.color || '#4361ee'}30;
    border-radius: 10px;
    padding: 14px;
    text-align: center;
  }
  .stat-value {
    font-size: 22px;
    font-weight: 800;
    color: ${project.color || '#4361ee'};
  }
  .stat-label {
    font-size: 11px;
    color: #777;
    margin-top: 2px;
  }
  h2 {
    font-size: 18px;
    margin: 36px 0 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid #eee;
    color: #1a1a1a;
  }
  .section-body {
    font-size: 14px;
    color: #333;
    margin-bottom: 24px;
    white-space: normal;
  }
  .members {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .member-pill {
    background: #f0f0f5;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    color: #444;
  }
  .footer {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid #ddd;
    font-size: 11px;
    color: #999;
    text-align: center;
  }
  /* 인쇄용 */
  @media print {
    body { margin: 0; padding: 16mm; }
    .no-print { display: none; }
    h2 { page-break-after: avoid; }
    .section-body { page-break-inside: avoid; }
  }
  .print-bar {
    position: fixed;
    top: 12px; right: 12px;
    background: ${project.color || '#4361ee'};
    color: #fff;
    padding: 8px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    border: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
</style>
</head>
<body>

<button class="print-bar no-print" onclick="window.print()">🖨️ 인쇄 / PDF 저장</button>

<div class="cover">
  <span class="cover-label">PROJECT COMPLETION REPORT</span>
  <h1>${escapeAndBreak(project.title)}</h1>
  ${project.description ? `<p class="desc">${escapeAndBreak(project.description)}</p>` : ''}

  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">기간</span>
      <span class="meta-value">${fmtDate(project.start_date)} ~ ${fmtDate(project.end_date)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">우선순위</span>
      <span class="meta-value">${pri.icon || ''} ${pri.label || '-'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">완료일</span>
      <span class="meta-value">${fmtDatetime(project.completed_at)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">완료자</span>
      <span class="meta-value">${escapeAndBreak(project.completed_by_name || '-')}</span>
    </div>
  </div>
</div>

<!-- 요약 통계 -->
<div class="stats">
  <div class="stat-card">
    <div class="stat-value">${snap.tasks_total || 0}</div>
    <div class="stat-label">전체 태스크</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${snap.tasks_done || 0}</div>
    <div class="stat-label">완료 태스크</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${snap.completion_rate || 0}%</div>
    <div class="stat-label">완료율</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${snap.member_count || 0}</div>
    <div class="stat-label">참여 인원</div>
  </div>
</div>

${snap.member_names && snap.member_names.length > 0 ? `
<h2>👥 참여 멤버</h2>
<div class="members">
  ${snap.member_names.map((n) => `<span class="member-pill">${escapeAndBreak(n)}</span>`).join('')}
</div>
` : ''}

<h2>🎯 목표</h2>
<div class="section-body">${escapeAndBreak(report.goals)}</div>

<h2>🏆 주요 성과</h2>
<div class="section-body">${escapeAndBreak(report.achievements)}</div>

<h2>📍 주요 마일스톤</h2>
<div class="section-body">${escapeAndBreak(report.milestones)}</div>

<h2>⚠️ 이슈와 해결 과정</h2>
<div class="section-body">${escapeAndBreak(report.issues)}</div>

<h2>💡 배운 점</h2>
<div class="section-body">${escapeAndBreak(report.learnings)}</div>

<h2>🚀 다음 단계</h2>
<div class="section-body">${escapeAndBreak(report.next_steps)}</div>

<div class="footer">
  Generated by NEXUS · ${fmtDatetime(new Date().toISOString())}
</div>

</body>
</html>`;
}

/* ─── 마크다운 보고서 생성 ──────────────────────────────────── */
export function buildReportMarkdown(project, report, snapshot) {
  const pri = PRIORITY_META[project.priority] || {};
  const snap = snapshot || report.snapshot || {};

  return `# ${project.title} — 프로젝트 완료 보고서

> ${project.description || '_(설명 없음)_'}

## 📋 기본 정보

| 항목 | 내용 |
|---|---|
| 기간 | ${fmtDate(project.start_date)} ~ ${fmtDate(project.end_date)} |
| 우선순위 | ${pri.icon || ''} ${pri.label || '-'} |
| 완료일 | ${fmtDatetime(project.completed_at)} |
| 완료자 | ${project.completed_by_name || '-'} |
| 참여 인원 | ${snap.member_count || 0}명 |

## 📊 결과 요약

- **전체 태스크**: ${snap.tasks_total || 0}개
- **완료 태스크**: ${snap.tasks_done || 0}개
- **완료율**: ${snap.completion_rate || 0}%

${snap.member_names?.length ? `## 👥 참여 멤버

${snap.member_names.map((n) => `- ${n}`).join('\n')}
` : ''}

## 🎯 목표

${report.goals || '_(작성되지 않음)_'}

## 🏆 주요 성과

${report.achievements || '_(작성되지 않음)_'}

## 📍 주요 마일스톤

${report.milestones || '_(작성되지 않음)_'}

## ⚠️ 이슈와 해결 과정

${report.issues || '_(작성되지 않음)_'}

## 💡 배운 점

${report.learnings || '_(작성되지 않음)_'}

## 🚀 다음 단계

${report.next_steps || '_(작성되지 않음)_'}

---

_Generated by NEXUS · ${fmtDatetime(new Date().toISOString())}_
`;
}

/* ─── 파일 다운로드 트리거 ──────────────────────────────────── */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/* ─── 새 창에 인쇄용 HTML 띄우기 ────────────────────────────── */
export function openPrintWindow(html) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    alert('팝업이 차단되었어요. 브라우저 설정에서 허용해주세요.');
    return;
  }
  w.document.write(html);
  w.document.close();
}

/* ─── 파일명 안전화 ─────────────────────────────────────────── */
export function safeFilename(name) {
  return (name || 'project_report')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 80);
}