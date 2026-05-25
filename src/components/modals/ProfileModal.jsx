// components/modals/ProfileModal.jsx
// 프로필 관리 — 이름/연락처/상태/아바타 + 생년월일.

import { useEffect, useRef, useState } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

const BUCKET = 'resources';
const AVATAR_FOLDER = 'avatars';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function extractStoragePath(publicUrl) {
  if (typeof publicUrl !== 'string') return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

/* 생년월일을 'MM월 DD일' 같은 표시용 문자열로 */
function fmtBirthDisplay(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  } catch { return ''; }
}

export default function ProfileModal({ isOpen, onClose }) {
  const { user, profile, updateProfile } = useAuth();
  const toast = useToast();

  /* 폼 상태 */
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(profile?.full_name || '');
    const lsPhone = (() => { try { return localStorage.getItem('nexus_user_phone') || ''; } catch (_) { return ''; } })();
    const lsStatus = (() => { try { return localStorage.getItem('nexus_user_status') || ''; } catch (_) { return ''; } })();
    setPhone(profile?.phone ?? lsPhone);
    setStatus(profile?.status_msg ?? lsStatus);
    setBirthDate(profile?.birth_date || '');
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [isOpen, profile]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      toast.warning('JPG, PNG, GIF, WebP 형식만 업로드할 수 있습니다.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.warning('이미지는 5MB 이하만 업로드할 수 있습니다.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
    setAvatarFile(file);
  };

  const uploadAvatar = async (file) => {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${AVATAR_FOLDER}/${user.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('public URL 생성 실패');
    return data.publicUrl;
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.warning('이름을 입력해주세요.');
      return;
    }
    setSaving(true);

    const updates = {
      full_name: trimmed,
      phone,
      status_msg: status,
      birth_date: birthDate || null,
    };

    let oldAvatarPathToRemove = null;
    if (avatarFile && user) {
      try {
        const newUrl = await uploadAvatar(avatarFile);
        updates.avatar_url = newUrl;
        const prevPath = extractStoragePath(profile?.avatar_url);
        if (prevPath) oldAvatarPathToRemove = prevPath;
      } catch (err) {
        console.error('[ProfileModal] avatar upload error:', err);
        toast.warning('아바타 업로드 실패 — 나머지 정보만 저장합니다.');
      }
    } else if (avatarFile && !user) {
      updates.avatar_url = avatarPreview;
    }

    const res = await updateProfile(updates);

    if (res.ok && oldAvatarPathToRemove) {
      supabase.storage
        .from(BUCKET)
        .remove([oldAvatarPathToRemove])
        .then(({ error }) => {
          if (error) console.warn('[ProfileModal] old avatar remove failed:', error);
        });
    }

    setSaving(false);

    if (res.ok) {
      toast.success('프로필 정보가 성공적으로 변경되었습니다.');
      onClose();
    } else {
      toast.error(res.error || '저장에 실패했습니다.');
    }
  };

  const avatarBg = avatarPreview
    ? `url(${avatarPreview})`
    : profile?.avatar_url
      ? `url(${profile.avatar_url})`
      : 'var(--hover-bg)';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="프로필 관리">
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: -6, marginBottom: 20 }}>
        내 정보를 최신 상태로 유지하세요.
      </p>

      <div className="profile-edit-layout">
        <div className="profile-avatar-sec">
          <div
            className="profile-avatar-preview"
            style={{ background: avatarBg, backgroundSize: 'cover', backgroundPosition: 'center' }}
            onClick={() => fileInputRef.current?.click()}
            title="프로필 사진 변경"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            사진 변경 (클릭)
            <br />
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>JPG · PNG · 5MB 이하</span>
          </span>
        </div>

        <div className="profile-form-sec">
          <div className="profile-input-group">
            <label>이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </div>
          <div className="profile-input-group">
            <label>연락처 (사내 번호/핸드폰)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
            />
          </div>
          <div className="profile-input-group">
            <label>상태 메시지</label>
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="현재 상태나 기분을 입력해보세요"
            />
          </div>
          <div className="profile-input-group">
            <label>
              <i className="fa-solid fa-cake-candles" style={{ color: '#f72585', marginRight: 6 }} />
              생년월일
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
              {birthDate
                ? `🎂 ${fmtBirthDisplay(birthDate)} · 이달의 소식에 표시됩니다`
                : '입력하시면 동료들이 생일을 챙길 수 있어요'}
            </small>
          </div>

          {/* 입사일 — 표시 전용 (관리자가 설정) */}
          {profile?.hire_date && (
            <div className="profile-input-group">
              <label>
                <i className="fa-solid fa-briefcase" style={{ color: '#06d6a0', marginRight: 6 }} />
                입사일
              </label>
              <input
                type="date"
                value={profile.hire_date}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                입사일은 관리자만 수정할 수 있어요
              </small>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 30, justifyContent: 'flex-end' }}>
        <button className="btn btn-out" style={{ width: 100 }} onClick={onClose} disabled={saving}>
          취소
        </button>
        <button className="btn btn-in" style={{ width: 120 }} onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </Modal>
  );
}