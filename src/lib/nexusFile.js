import { supabase } from './supabase';

// ⚠️ 실제 Supabase Storage 버킷명으로 변경하세요
const BUCKET = 'resources';

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

// 파일 크기 포맷
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// 파일 확장자별 아이콘
export function getFileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map = {
    pdf: 'fa-file-pdf',
    doc: 'fa-file-word', docx: 'fa-file-word',
    xls: 'fa-file-excel', xlsx: 'fa-file-excel', csv: 'fa-file-csv',
    ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
    zip: 'fa-file-zipper', rar: 'fa-file-zipper', '7z': 'fa-file-zipper',
    jpg: 'fa-file-image', jpeg: 'fa-file-image', png: 'fa-file-image',
    gif: 'fa-file-image', webp: 'fa-file-image', svg: 'fa-file-image',
    txt: 'fa-file-lines', md: 'fa-file-lines',
    mp4: 'fa-file-video', mov: 'fa-file-video',
    mp3: 'fa-file-audio', wav: 'fa-file-audio',
  };
  return map[ext] || 'fa-file';
}

// 단일 파일 업로드 → { path, name, size, type } 반환
async function uploadOne(file, folder = 'board') {
  if (file.size > MAX_SIZE) {
    throw new Error(`"${file.name}" 파일이 25MB를 초과합니다.`);
  }

  // 고유 경로 생성: board/1715600000000_abc12_파일명.pdf
  const unique =
    Date.now().toString() + '_' + Math.random().toString(36).slice(2, 7);
  const safeName = file.name.replace(/[^\w.\-가-힣]/g, '_');
  const path = `${folder}/${unique}_${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;

  return {
    path,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

// 여러 파일 업로드 (실패한 건 건너뜀)
export async function uploadMany(fileList, folder = 'board') {
  const files = Array.from(fileList);
  const results = [];
  for (const file of files) {
    try {
      const result = await uploadOne(file, folder);
      results.push(result);
    } catch (err) {
      console.error('[NexusFile] upload error:', err);
      // 실패한 파일은 건너뛰고 계속
    }
  }
  return results;
}

// Storage에서 파일 삭제
export async function remove(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error('[NexusFile] remove error:', error);
}

// 여러 파일 삭제
export async function removeMany(paths = []) {
  const valid = paths.filter(Boolean);
  if (valid.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(valid);
  if (error) console.error('[NexusFile] removeMany error:', error);
}

// 다운로드용 public URL 가져오기
export function getPublicUrl(path) {
  if (!path) return '';
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || '';
}

// 이미지 파일 여부
export function isImage(name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}