import { FORM_META } from '../../config/approvalForms';

export default function DynamicFields({ formType, values, onChange }) {
  const meta = FORM_META[formType];
  const fields = meta?.fields || [];

  if (fields.length === 0) return null;

  return (
    <div
      className="appr-field-grid"
      style={{
        gridTemplateColumns: fields.length > 2 ? '1fr 1fr' : '1fr',
      }}
    >
      {fields.map((f) => (
        <div key={f.id} className="appr-field-item">
          <label className="appr-label">{f.label}</label>
          <input
            type={f.type}
            className="appr-input"
            placeholder={f.placeholder}
            value={values[f.id] || ''}
            onChange={(e) => onChange(f.id, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}