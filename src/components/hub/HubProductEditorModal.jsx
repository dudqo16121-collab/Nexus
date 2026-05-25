// components/hub/HubProductEditorModal.jsx
// 관리자용 상품 등록/수정 모달.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useHub, PRODUCT_CATEGORIES } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';

const ICON_PRESETS = [
  'fa-gift', 'fa-umbrella-beach', 'fa-utensils', 'fa-mug-hot', 'fa-ticket',
  'fa-headphones', 'fa-shirt', 'fa-cake-candles', 'fa-laptop', 'fa-mobile',
  'fa-coffee', 'fa-cookie-bite', 'fa-house', 'fa-bicycle', 'fa-car',
];

const COLOR_PRESETS = [
  '#4361ee', '#06d6a0', '#f72585', '#ff9f1c', '#8338ec',
  '#ec4899', '#3aafa9', '#f59e0b', '#ef4444', '#6b7280',
];

export default function HubProductEditorModal({ isOpen, onClose, product }) {
  const toast = useToast();
  const { createProduct, updateProduct } = useHub();

  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: 'fa-gift',
    color: '#4361ee',
    price_points: 100,
    stock: -1,
    category: 'goods',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const isEdit = !!product;

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        icon: product.icon || 'fa-gift',
        color: product.color || '#4361ee',
        price_points: product.price_points || 100,
        stock: product.stock ?? -1,
        category: product.category || 'goods',
        is_active: product.is_active !== false,
      });
    } else {
      setForm({
        name: '',
        description: '',
        icon: 'fa-gift',
        color: '#4361ee',
        price_points: 100,
        stock: -1,
        category: 'goods',
        is_active: true,
      });
    }
  }, [product, isOpen]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('상품명을 입력하세요.');
      return;
    }
    if (form.price_points < 0) {
      toast.error('가격은 0 이상이어야 합니다.');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      icon: form.icon,
      color: form.color,
      price_points: parseInt(form.price_points, 10),
      stock: parseInt(form.stock, 10),
      category: form.category,
      is_active: form.is_active,
    };

    const res = isEdit
      ? await updateProduct(product.id, payload)
      : await createProduct(payload);

    setSaving(false);

    if (res.ok) {
      toast.success(isEdit ? '상품이 수정되었어요' : '상품이 등록되었어요');
      onClose();
    } else {
      toast.error(res.error || '실패');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={isEdit ? '상품 수정' : '새 상품 등록'}
    >
      <div className="hub-product-form">
        {/* 미리보기 */}
        <div className="hub-product-preview">
          <div
            className="hub-product-icon"
            style={{ background: `${form.color}15`, color: form.color }}
          >
            <i className={`fa-solid ${form.icon}`} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {form.name || '상품명 미리보기'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-coins" /> {form.price_points}P
            </div>
          </div>
        </div>

        {/* 상품명 */}
        <div className="hub-form-field">
          <label>상품명 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="예: 연차 1일 사용권"
          />
        </div>

        {/* 설명 */}
        <div className="hub-form-field">
          <label>설명</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="상품 설명 또는 안내 사항"
          />
        </div>

        {/* 가격 + 재고 + 카테고리 */}
        <div className="hub-form-grid">
          <div className="hub-form-field">
            <label>가격 (포인트)</label>
            <input
              type="number"
              min={0}
              value={form.price_points}
              onChange={(e) => set('price_points', e.target.value)}
            />
          </div>
          <div className="hub-form-field">
            <label>재고 (-1: 무제한)</label>
            <input
              type="number"
              min={-1}
              value={form.stock}
              onChange={(e) => set('stock', e.target.value)}
            />
          </div>
          <div className="hub-form-field">
            <label>카테고리</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            >
              {PRODUCT_CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 아이콘 선택 */}
        <div className="hub-form-field">
          <label>아이콘</label>
          <div className="hub-icon-grid">
            {ICON_PRESETS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`hub-icon-btn ${form.icon === ic ? 'active' : ''}`}
                onClick={() => set('icon', ic)}
              >
                <i className={`fa-solid ${ic}`} />
              </button>
            ))}
          </div>
        </div>

        {/* 색상 선택 */}
        <div className="hub-form-field">
          <label>색상</label>
          <div className="hub-color-grid">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={`hub-color-btn ${form.color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => set('color', c)}
              />
            ))}
          </div>
        </div>

        {/* 판매 여부 */}
        <label className="hub-form-toggle">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
          />
          <span>판매 활성화 (체크 해제 시 상점에 표시되지 않음)</span>
        </label>

        <div className="hub-form-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>취소</button>
          <button className="btn btn-in" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><i className="fa-solid fa-spinner fa-spin" /> 저장 중...</>
            ) : isEdit ? '수정 완료' : '등록'}
          </button>
        </div>
      </div>
    </Modal>
  );
}