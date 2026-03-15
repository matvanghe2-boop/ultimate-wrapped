"use client";

import { PERIOD_OPTIONS, type PeriodKey } from "../../lib/queries/types";

interface PeriodFilterProps {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  disabled?: boolean;
}

export function PeriodFilter({ value, onChange, disabled }: PeriodFilterProps) {
  const currentLabel = PERIOD_OPTIONS.find((o) => o.key === value)?.label ?? "Période";

  return (
    <div className="period-filter">
      <span className="period-filter__label">Période :</span>

      {/* Menu déroulant — mobile */}
      <div className="period-filter__select-wrapper">
        <select
          className="period-filter__select"
          value={value}
          onChange={(e) => onChange(e.target.value as PeriodKey)}
          disabled={disabled}
          aria-label="Sélection de période"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="period-filter__select-arrow">▾</span>
      </div>

      {/* Pills — desktop uniquement */}
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