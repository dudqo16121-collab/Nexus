// components/wiki/WikiTemplateModal.jsx
// 새 문서 만들 때 템플릿 선택 모달.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { WIKI_TEMPLATES, getTemplate } from '../../config/wikiTemplates';

export default function WikiTemplateModal({ isOpen, onClose, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);

  /* 키보드 단축키 — Esc는 Modal이 처리, Enter는 첫 항목 선택 */
  useEffect(() => {
    if (!isOpen) {
      setHoveredId(null);
    }
  }, [isOpen]);

  const handleSelect = (id) => {
    const t = getTemplate(id);
    if (!t) return;
    onSelect(t);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="새 문서 만들기"
    >
      <div className="wiki-tpl-intro">
        <i className="fa-solid fa-wand-magic-sparkles" />
        템플릿을 선택하면 미리 정의된 구조로 시작할 수 있어요.
      </div>

      <div className="wiki-tpl-grid">
        {WIKI_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className="wiki-tpl-card"
            onClick={() => handleSelect(tpl.id)}
            onMouseEnter={() => setHoveredId(tpl.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className="wiki-tpl-icon"
              style={{ background: `${tpl.color}15`, color: tpl.color }}
            >
              <i className={`fa-solid ${tpl.icon}`} />
            </div>
            <div className="wiki-tpl-body">
              <h4 className="wiki-tpl-name">{tpl.name}</h4>
              <p className="wiki-tpl-desc">{tpl.description}</p>
              {tpl.tags?.length > 0 && (
                <div className="wiki-tpl-tags">
                  {tpl.tags.map((t) => (
                    <span key={t} className="wiki-tpl-tag">#{t}</span>
                  ))}
                </div>
              )}
            </div>
            <i className="fa-solid fa-arrow-right wiki-tpl-arrow" />
          </button>
        ))}
      </div>
    </Modal>
  );
}