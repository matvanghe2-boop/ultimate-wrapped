// ============================================================
// components/dashboard/PeriodFilter.tsx
// Sélecteur de période temporelle
// Ultimate Wrapped — Sprint 2
// ============================================================

"use client";

import { PERIOD_OPTIONS, type PeriodKey } from "../../lib/queries/types";

interface PeriodFilterProps {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  disabled?: boolean;
}

export function PeriodFilter({ value, onChange, disabled }: PeriodFilterProps) {
  return (
    <div className="period-filter">
      <span className="period-filter__label">Période :</span>
      <div className="period-filter__options" role="group" aria-label="Sélection de période">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`period-filter__btn ${value === opt.key ? "period-filter__btn--active" : ""}`}
            onClick={() => onChange(opt.key)}
            disabled={disabled}
            aria-pressed={value === opt.key}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
