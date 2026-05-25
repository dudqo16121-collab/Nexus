// components/hub/HubMarket.jsx
// 포인트 상점 + 인벤토리.

import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useHub, PRODUCT_CATEGORIES } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';
import HubProductEditorModal from './HubProductEditorModal';

const STATUS_META = {
  pending: { label: '미사용', color: '#06d6a0', icon: 'fa-check-circle' },
  used:    { label: '사용 완료', color: '#6b7280', icon: 'fa-circle-check' },
  expired: { label: '만료', color: '#ef4444', icon: 'fa-circle-xmark' },
};

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HubMarket() {
  const { profile } = useAuth();
  const toast = useToast();
  const {
    products,
    purchases,
    marketLoading,
    myPoints,           // HubContext 가 노출하는 본인 포인트 (없으면 0)
    purchaseProduct,
    useMyPurchase,
    deleteProduct,
  } = useHub();

  const isAdmin = profile?.is_admin === true;

  const [tab, setTab] = useState('shop'); // 'shop' | 'inventory'
  const [filter, setFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [buying, setBuying] = useState(null); // productId

  /* 필터 */
  const filteredProducts = useMemo(() => {
    if (filter === 'all') return products;
    return products.filter((p) => p.category === filter);
  }, [products, filter]);

  /* 구매 */
  const handleBuy = async (product) => {
    if ((myPoints || 0) < product.price_points) {
      toast.error('포인트가 부족합니다.');
      return;
    }
    if (!confirm(
      `"${product.name}"을(를) ${product.price_points}P로 구매하시겠습니까?`
    )) return;

    setBuying(product.id);
    const res = await purchaseProduct(product.id);
    setBuying(null);

    if (res.ok) {
      toast.success(`구매 완료! 잔여 포인트: ${res.data?.points_remaining}P`);
      setTab('inventory');
    } else {
      toast.error(res.error || '구매 실패');
    }
  };

  /* 사용 처리 */
  const handleUse = async (purchase) => {
    if (!confirm(`"${purchase.product_name}"을(를) 사용 처리할까요?`)) return;
    const res = await useMyPurchase(purchase.id);
    if (res.ok) {
      toast.success('사용 완료로 표시되었습니다.');
    } else {
      toast.error(res.error || '실패');
    }
  };

  /* 관리자 — 상품 삭제 */
  const handleDeleteProduct = async (product) => {
    if (!confirm(`"${product.name}" 상품을 삭제할까요? (구매 내역은 보존됩니다)`)) return;
    const res = await deleteProduct(product.id);
    if (res.ok) toast.success('삭제되었어요');
    else toast.error(res.error || '삭제 실패');
  };

  return (
    <div className="hub-market">
      {/* 탭 */}
      <div className="hub-market-tabs">
        <button
          type="button"
          className={`hub-market-tab ${tab === 'shop' ? 'active' : ''}`}
          onClick={() => setTab('shop')}
        >
          <i className="fa-solid fa-store" /> 상점
          <span className="hub-market-tab-count">{products.length}</span>
        </button>
        <button
          type="button"
          className={`hub-market-tab ${tab === 'inventory' ? 'active' : ''}`}
          onClick={() => setTab('inventory')}
        >
          <i className="fa-solid fa-box" /> 내 인벤토리
          {purchases.filter((p) => p.status === 'pending').length > 0 && (
            <span className="hub-market-tab-count hub-market-tab-count-hot">
              {purchases.filter((p) => p.status === 'pending').length}
            </span>
          )}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 보유 포인트 */}
          <div className="hub-market-points">
            <i className="fa-solid fa-coins" />
            <span>{myPoints || 0}P</span>
          </div>

          {/* 관리자 — 상품 등록 */}
          {isAdmin && tab === 'shop' && (
            <button
              type="button"
              className="hub-market-add-btn"
              onClick={() => {
                setEditTarget(null);
                setEditorOpen(true);
              }}
            >
              <i className="fa-solid fa-plus" /> 상품 등록
            </button>
          )}
        </div>
      </div>

      {/* 상점 탭 */}
      {tab === 'shop' && (
        <>
          {/* 카테고리 필터 */}
          <div className="hub-market-filters">
            {PRODUCT_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`hub-market-chip ${filter === c.value ? 'active' : ''}`}
                onClick={() => setFilter(c.value)}
              >
                <i className={`fa-solid ${c.icon}`} />
                {c.label}
              </button>
            ))}
          </div>

          {/* 상품 그리드 */}
          {marketLoading ? (
            <div className="hub-market-empty">
              <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="hub-market-empty">
              <i className="fa-regular fa-folder-open" />
              <p>등록된 상품이 없어요.</p>
              {isAdmin && (
                <button
                  className="hub-market-empty-btn"
                  onClick={() => { setEditTarget(null); setEditorOpen(true); }}
                >
                  첫 상품 등록하기
                </button>
              )}
            </div>
          ) : (
            <div className="hub-market-grid">
              {filteredProducts.map((p) => {
                const canBuy = (myPoints || 0) >= p.price_points && p.stock !== 0;
                return (
                  <div key={p.id} className="hub-product-card">
                    <div
                      className="hub-product-icon"
                      style={{ background: `${p.color || '#4361ee'}15`, color: p.color || '#4361ee' }}
                    >
                      <i className={`fa-solid ${p.icon || 'fa-gift'}`} />
                    </div>
                    <h4 className="hub-product-name">{p.name}</h4>
                    {p.description && (
                      <p className="hub-product-desc">{p.description}</p>
                    )}
                    <div className="hub-product-footer">
                      <span className="hub-product-price">
                        <i className="fa-solid fa-coins" /> {p.price_points}P
                      </span>
                      {p.stock !== -1 && (
                        <span className="hub-product-stock">
                          재고 {p.stock}개
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="hub-product-buy-btn"
                      disabled={!canBuy || buying === p.id}
                      onClick={() => handleBuy(p)}
                    >
                      {buying === p.id ? (
                        <><i className="fa-solid fa-spinner fa-spin" /> 처리 중...</>
                      ) : p.stock === 0 ? (
                        '품절'
                      ) : !canBuy ? (
                        '포인트 부족'
                      ) : (
                        <>구매하기 <i className="fa-solid fa-cart-shopping" /></>
                      )}
                    </button>
                    {isAdmin && (
                      <div className="hub-product-admin-actions">
                        <button
                          type="button"
                          title="수정"
                          onClick={() => { setEditTarget(p); setEditorOpen(true); }}
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          type="button"
                          title="삭제"
                          onClick={() => handleDeleteProduct(p)}
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 인벤토리 탭 */}
      {tab === 'inventory' && (
        <>
          {purchases.length === 0 ? (
            <div className="hub-market-empty">
              <i className="fa-regular fa-box" />
              <p>아직 구매한 상품이 없어요.</p>
              <button
                className="hub-market-empty-btn"
                onClick={() => setTab('shop')}
              >
                상점 둘러보기
              </button>
            </div>
          ) : (
            <div className="hub-inventory-list">
              {purchases.map((purchase) => {
                const status = STATUS_META[purchase.status] || STATUS_META.pending;
                return (
                  <div key={purchase.id} className={`hub-inv-card hub-inv-${purchase.status}`}>
                    <div
                      className="hub-inv-icon"
                      style={{
                        background: `${purchase.product_color || '#4361ee'}15`,
                        color: purchase.product_color || '#4361ee',
                      }}
                    >
                      <i className={`fa-solid ${purchase.product_icon || 'fa-gift'}`} />
                    </div>
                    <div className="hub-inv-body">
                      <h4 className="hub-inv-name">{purchase.product_name}</h4>
                      {purchase.product_description && (
                        <p className="hub-inv-desc">{purchase.product_description}</p>
                      )}
                      <div className="hub-inv-meta">
                        <span>
                          <i className="fa-solid fa-coins" /> -{purchase.price_paid}P
                        </span>
                        <span className="hub-inv-sep">·</span>
                        <span>{fmtDateTime(purchase.created_at)} 구매</span>
                        {purchase.used_at && (
                          <>
                            <span className="hub-inv-sep">·</span>
                            <span>{fmtDateTime(purchase.used_at)} 사용</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="hub-inv-actions">
                      <span
                        className="hub-inv-status"
                        style={{
                          background: `${status.color}15`,
                          color: status.color,
                        }}
                      >
                        <i className={`fa-solid ${status.icon}`} /> {status.label}
                      </span>
                      {purchase.status === 'pending' && (
                        <button
                          type="button"
                          className="hub-inv-use-btn"
                          onClick={() => handleUse(purchase)}
                        >
                          사용 처리
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 상품 편집 모달 */}
      <HubProductEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        product={editTarget}
      />
    </div>
  );
}