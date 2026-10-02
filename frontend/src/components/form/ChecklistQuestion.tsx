import React from 'react';

import { ChecklistAnswer } from '@ras/shared';

const OPTIONS: { value: ChecklistAnswer; label: string; className: string }[] = [
  { value: 'YES', label: 'Yes', className: 'yes' },
  { value: 'NO', label: 'No', className: 'no' },
  { value: 'NA', label: 'N/A', className: 'na' },
];

interface Props {
  id: string;
  label: string;
  value?: ChecklistAnswer;
  error?: string;
  onChange: (value: ChecklistAnswer) => void;
}

/** One checklist row with large Yes / No / N/A buttons (easy to tap with gloves on). */
export const ChecklistQuestion: React.FC<Props> = ({ id, label, value, error, onChange }) => (
  <div className={`question${error ? ' has-error' : ''}`} id={`q-${id}`}>
    <span className="question__label" id={`label-${id}`}>
      {label}
    </span>
    <div className="segmented" role="group" aria-labelledby={`label-${id}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.className}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
    {error && (
      <span className="field-error" style={{ flexBasis: '100%' }}>
        {error}
      </span>
    )}
  </div>
);
