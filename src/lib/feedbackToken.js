// lib/feedbackToken.js
// 익명 피드백의 본인 인증용 토큰을 localStorage 에 보관.
//
// 핵심 원칙:
//   - 토큰은 브라우저에만 존재. 잃어버리면 본인도 못 찾음 = 의도된 설계.
//   - user_id 와의 매핑이 어디에도 저장되지 않으므로 익명성 보장.
//   - 같은 사람이 여러 기기에서 작성하면 각각의 기기에서만 본인 글이 보임.
//   - 같은 브라우저에서 다른 계정으로 로그인하면 다른 슬롯을 보게 됨 (계정 격리).

const STORAGE_KEY_PREFIX = 'nexus_feedback_tokens_v2';   // 계정별 슬롯
const SEEN_KEY_PREFIX = 'nexus_feedback_seen_responses_v2';
const CURRENT_USER_KEY = 'nexus_feedback_current_user';  // 현재 활성 슬롯 ID

/* ─── 현재 활성 사용자 ID 관리 ────────────────────────────────
   AuthContext 에서 로그인/로그아웃 시 setCurrentUser 를 호출.
   이 ID 가 토큰 저장소의 슬롯 키가 됨.
   주의: 이 값은 단순한 "어떤 슬롯을 쓸지" 용도일 뿐,
        DB에는 절대 저장되지 않음 → 익명성에는 영향 없음.
*/
let _currentUserId = null;

export function setCurrentUser(userId) {
  _currentUserId = userId || null;
  try {
    if (userId) {
      sessionStorage.setItem(CURRENT_USER_KEY, userId);
    } else {
      sessionStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {}
}

export function getCurrentUser() {
  if (_currentUserId) return _currentUserId;
  try {
    _currentUserId = sessionStorage.getItem(CURRENT_USER_KEY);
  } catch (e) {}
  return _currentUserId;
}

/* 슬롯 키 생성 — 현재 user 가 없으면 'anon' (비로그인 상태에서는 토큰 X) */
function storageKey() {
  const uid = getCurrentUser();
  return `${STORAGE_KEY_PREFIX}::${uid || 'anon'}`;
}

function seenKey() {
  const uid = getCurrentUser();
  return `${SEEN_KEY_PREFIX}::${uid || 'anon'}`;
}

/* ─── 토큰 CRUD ─────────────────────────────────────────────── */

export function getAllTokens() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.warn('[feedbackToken] read failed:', e);
    return {};
  }
}

export function getToken(feedbackId) {
  if (!feedbackId) return null;
  if (!getCurrentUser()) return null;   // 로그인 안 됐으면 토큰 없음
  const all = getAllTokens();
  return all[feedbackId]?.token || null;
}

export function saveToken(feedbackId, token, title) {
  if (!feedbackId || !token) return;
  if (!getCurrentUser()) {
    console.warn('[feedbackToken] saveToken: no current user');
    return;
  }
  try {
    const all = getAllTokens();
    all[feedbackId] = {
      token,
      savedAt: new Date().toISOString(),
      title: title || '',
    };
    localStorage.setItem(storageKey(), JSON.stringify(all));
  } catch (e) {
    console.warn('[feedbackToken] save failed:', e);
  }
}

export function removeToken(feedbackId) {
  if (!feedbackId) return;
  try {
    const all = getAllTokens();
    delete all[feedbackId];
    localStorage.setItem(storageKey(), JSON.stringify(all));
    removeSeenCount(feedbackId);
  } catch (e) {
    console.warn('[feedbackToken] remove failed:', e);
  }
}

export function getMyFeedbackIds() {
  const all = getAllTokens();
  return Object.entries(all)
    .sort(([, a], [, b]) => new Date(b.savedAt) - new Date(a.savedAt))
    .map(([id]) => id);
}

export function isMine(feedbackId) {
  return Boolean(getToken(feedbackId));
}

/* ─── reaction 해시 ─────────────────────────────────────────── */
export async function hashUserForReaction(userId, feedbackId) {
  if (!userId || !feedbackId) throw new Error('userId/feedbackId 필수');
  const salt = 'nexus_fb_reaction_v1';
  const input = `${salt}::${userId}::${feedbackId}`;
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ─── 응답 알림 추적 ────────────────────────────────────────── */

export function getAllSeenCounts() {
  try {
    const raw = localStorage.getItem(seenKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    return {};
  }
}

export function getSeenCount(feedbackId) {
  const all = getAllSeenCounts();
  return Number(all[feedbackId] || 0);
}

export function markResponsesSeen(feedbackId, count) {
  if (!feedbackId) return;
  if (!getCurrentUser()) return;
  try {
    const all = getAllSeenCounts();
    all[feedbackId] = Number(count) || 0;
    localStorage.setItem(seenKey(), JSON.stringify(all));
  } catch (e) {
    console.warn('[feedbackToken] markResponsesSeen failed:', e);
  }
}

export function removeSeenCount(feedbackId) {
  if (!feedbackId) return;
  try {
    const all = getAllSeenCounts();
    delete all[feedbackId];
    localStorage.setItem(seenKey(), JSON.stringify(all));
  } catch (e) {}
}

export function findFeedbacksWithNewResponses(feedbacks = []) {
  const myTokens = getAllTokens();
  const seenCounts = getAllSeenCounts();
  const results = [];

  for (const f of feedbacks) {
    if (!myTokens[f.id]) continue;
    const current = Number(f.response_count || 0);
    const seen = Number(seenCounts[f.id] || 0);
    if (current > seen) {
      results.push({
        feedbackId: f.id,
        newCount: current - seen,
        prevCount: seen,
        currentCount: current,
        feedback: f,
      });
    }
  }
  return results;
}