// utils/approvalLinkage.js
// 결재 승인/취소 시 외부 데이터(일정/회의실 등) 자동 연동 로직.
//
// processApproval 안에서 import 해서 호출한다.
// 결재 Context 자체를 무겁게 만들지 않으려 별도 파일로 분리.
//
// RLS 우회를 위해 SECURITY DEFINER RPC 함수를 호출한다.
//  - create_linked_schedule_event(p_approval_id, ...) : 자동 일정 생성
//  - cleanup_linked_schedule_events(p_approval_id)   : 자동 일정 정리

import { supabase } from '../lib/supabase';

/* 휴가 카테고리 색 — ScheduleContext.CATEGORIES 와 동기화 */
const COLOR_LEAVE = '#f72585';      // 휴가
const COLOR_BUSINESS = '#ff9f1c';   // 출장

/**
 * 연차신청서 — 승인 시 schedule_events 에 휴가 일정 자동 추가.
 * fields.f_start_date / f_end_date / f_leave_type 사용.
 */
async function onLeaveApproved(doc) {
  try {
    const f = doc.fields || {};
    const startDate = f.f_start_date;
    const endDate = f.f_end_date || f.f_start_date;
    if (!startDate) return { ok: false, reason: 'no-date' };

    const leaveType = f.f_leave_type || '휴가';
    const days = f.f_days || '';

    /* RPC 호출 — RLS 우회 + 결재 상태 서버 검증 */
    const { data, error } = await supabase.rpc('create_linked_schedule_event', {
      p_approval_id: doc.id,
      p_title: `🌴 ${doc.drafter_name || '직원'} - ${leaveType}`,
      p_description: `결재 승인된 휴가입니다.${days ? ` (${days}일)` : ''}\n사유: ${doc.title || ''}`,
      p_category: 'leave',
      p_color: COLOR_LEAVE,
      p_start_at: `${startDate}T00:00:00`,
      p_end_at: `${endDate}T23:59:59`,
      p_author_id: doc.drafter_id,
    });
    if (error) throw error;

    return { ok: true, event_id: data, message: '휴가 일정이 자동 등록되었어요' };
  } catch (e) {
    console.error('[Linkage] onLeaveApproved:', e);
    return { ok: false, reason: e.message };
  }
}

/**
 * 출장신청서 — 승인 시 schedule_events 에 출장 일정 자동 추가.
 * fields.f_start_date / f_end_date / f_dest 사용.
 */
async function onBusinessTripApproved(doc) {
  try {
    const f = doc.fields || {};
    const startDate = f.f_start_date;
    const endDate = f.f_end_date || f.f_start_date;
    if (!startDate) return { ok: false, reason: 'no-date' };

    const dest = f.f_dest || '출장지 미정';

    const { data, error } = await supabase.rpc('create_linked_schedule_event', {
      p_approval_id: doc.id,
      p_title: `✈️ ${doc.drafter_name || '직원'} - 출장 (${dest})`,
      p_description: `결재 승인된 출장입니다.\n출장지: ${dest}\n사유: ${doc.title || ''}`,
      p_category: 'business',
      p_color: COLOR_BUSINESS,
      p_start_at: `${startDate}T00:00:00`,
      p_end_at: `${endDate}T23:59:59`,
      p_author_id: doc.drafter_id,
    });
    if (error) throw error;

    return { ok: true, event_id: data, message: '출장 일정이 자동 등록되었어요' };
  } catch (e) {
    console.error('[Linkage] onBusinessTripApproved:', e);
    return { ok: false, reason: e.message };
  }
}

/**
 * 결재 양식별 디스패치 — '승인' 시점에 호출.
 * @returns {object|null} { type, message } — UI에서 토스트로 띄울 부가 메시지
 */
export async function runApprovalLinkage(doc) {
  if (!doc) return null;

  let result = null;
  switch (doc.type) {
    case '연차신청서':
      result = await onLeaveApproved(doc);
      break;
    case '출장신청서':
      result = await onBusinessTripApproved(doc);
      break;
    default:
      return null;
  }

  if (result?.ok) return { type: doc.type, message: result.message };
  return null;
}

/**
 * 결재 반려/취소 시 — 자동 생성된 연관 데이터 정리.
 */
export async function cleanupLinkedData(approvalId) {
  if (!approvalId) return;
  try {
    const { error } = await supabase.rpc('cleanup_linked_schedule_events', {
      p_approval_id: approvalId,
    });
    if (error) throw error;
  } catch (e) {
    console.error('[Linkage] cleanupLinkedData:', e);
  }
}