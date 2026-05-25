// lib/pulseHash.js
// 펄스 서베이 응답의 user_hash 생성.
// 같은 사람이 같은 설문에 두 번 응답 못 하게 + 관리자가 DB 봐도 누군지 모르게.

export async function hashUserForPulse(userId, surveyId) {
  if (!userId || !surveyId) throw new Error('userId/surveyId 필수');
  const salt = 'nexus_pulse_v1';
  const input = `${salt}::${userId}::${surveyId}`;
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}